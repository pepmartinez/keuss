var async = require ('async');
var _ =     require ('lodash');
var uuid =  require ('uuid');

var debug = require('debug')('keuss:Queue:base');


class Queue {

  //////////////////////////////////////////////
  constructor (name, factory, opts) {
  //////////////////////////////////////////////
    if (!name) {
      throw new Error ('provide a queue name');
    }

    this._opts = opts || {};

    this._name = name;
    this._factory = factory;

    // most mature
    // values:
    // * null: unknown, triggers read this.next_t() from backend
    // * 0:    known to be no element in queue, accepts values from insertNotifs
    // * <non-zero int>: a know value, to be trusted.  accepts values from insertNotifs if lower
    this._next_mature_t = null;

    // defaults
    this._pollInterval = this._opts.pollInterval || 60000;

    // map of active consumers
    this._consumers_by_tid = new Map();

    this._signaller = factory._signaller_factory.signal (this, this._opts.signaller.opts);
    this._stats = factory._stats_factory.stats (factory.name(), this.name (), this._opts.stats.opts);

    // save opts minus stats & signaller
    var __opts = _.omit (this._opts, ['signaller', 'stats']);
    this._stats.opts (__opts, () => {});

    this._stats.incr ('get', 0);
    this._stats.incr ('put', 0);

    // if true, queue is being drained just before shutdown
    this._in_drain = false;

    // if true, queue has been drained and is now not usable
    this._drained = false;

    debug ('created queue %s with opts %o', this._name, this._opts);
  }


  ////////////////////////////////////////////////////////////////////////////
  // expected redefinitions on subclasses

  // add element to queue
  insert (entry, callback) {callback (null, null);}

  // get element from queue
  get (callback) {callback (null, {mature: 0, payload: null, tries: 0});}

  // reserve element: call cb (err, pl) where pl has an id
  reserve (callback) {callback (null, {mature: 0, payload: null, tries: 0}, null);}

  // commit previous reserve, by p.id: call cb (err, true|false), true if element committed
  commit (id, callback) {callback (null, false);}

  // rollback previous reserve, by p.id: call cb (err, true|false), true if element rolled back
  rollback (id, next_t, callback) {callback (null, false);}

  // pipeline: atomically passes to next queue a previously reserved element, by id
  pl_step (id, next_queue, opts, callback) {callback (null, false);}

  // queue size including non-mature elements
  totalSize (callback) {callback (null, 0);}

  // queue size NOT including non-mature elements
  size (callback) {callback (null, 0);}

  // queue size of non-mature elements only
  schedSize (callback) {callback (null, 0);}

  // queue size of reserved elements only
  resvSize (callback) {callback (null, null);}

  // Date of next
  next_t (callback) {callback (null, null);}

  // end of expected redefinitions on subclasses
  ////////////////////////////////////////////////////////////////////////////

  stats    (cb) {this._stats.values (cb);}
  topology (cb) {this._stats.topology (cb);}
  paused   (cb) {this._stats.paused (cb);}

  // placeholder methods
  name () {return this._name;}
  ns ()   {return this._factory.name();}
  type () {return 'queue:base';}

  // capabilities
  capabilities () {
    return this._factory.capabilities ();
  }

  // T of next mature
  nextMatureDate () {return this._next_mature_t;}

  static now ()             {return (new Date ());}
  static nowPlusSecs (secs) {return (new Date (Date.now () + secs * 1000));}


  /////////////////////////////////////////
  consumers () {
  /////////////////////////////////////////
    let r = [];

    this._consumers_by_tid.forEach ((value, key) => {
      r.push ({
        tid: value.tid,
        since: value.since,
        callback: (value.callback ? 'set' : 'unset'),
        cleanup_timeout: (value.cleanup_timeout ? 'set' : 'unset'),
        wakeup_timeout: (value.wakeup_timeout ? 'set' : 'unset')
      });
    });

    return r;
  }


  /////////////////////////////////////////
  nConsumers () {
  /////////////////////////////////////////
    return this._consumers_by_tid.size;
  }


  /////////////////////////////////////////
  // called when an insertion has been signaled
  signalInsertion (mature, cb) {
    // ignore if paused
    if (this._local_paused) {
      if (cb) return cb ();
      else return;
    }

    if (_.isNull (this._next_mature_t)) {
      // totally ignore it, let pop() get it via next_t()
      debug ('%s: signalInsertion received with mature %s. _next_mature_t is null, ignoring', this._name, mature.toISOString ());
      if (cb) return cb ();
      else return;
    }
    else if (this._next_mature_t == 0) {
      // next_t() forced a read and the result was 'empty': trust the notif
      debug ('%s: signalInsertion received with mature %s. _next_mature_t is 0, trusting notif', this._name, mature.toISOString ());
      this._next_mature_t = mature.getTime ();
    }
    else if (this._next_mature_t <= mature.getTime ()) {
      // _next_mature_t is numeric and non-null, so an active wait is happening. ignore it
      debug ('%s: signalInsertion received with mature %s. _next_mature_t (%s) is lower, ignoring', this._name, mature.toISOString (), new Date(this._next_mature_t).toISOString());
      if (cb) return cb ();
      else return;
    }
    else {
      // _next_mature_t is numeric and non-null, so an active wait is happening. ignore it
      debug ('%s: signalInsertion received with mature %s. _next_mature_t (%s) is higher, trusting notif', this._name, mature.toISOString (), new Date(this._next_mature_t).toISOString());
      this._next_mature_t = mature.getTime ();
    }

    this._nextDelta (delta_ms => {
      // run a wakeup on all consumers with the wakeup timer set
      debug ('%s: signalInsertion: waking up all consumers with wakeup already set', this._name);

      this._consumers_by_tid.forEach ((consumer, tid) => {
        debug ('%s: signalInsertion: waking up consumer %d', this._name, tid);

        if (consumer.wakeup_timeout) {
          clearTimeout (consumer.wakeup_timeout);
          consumer.wakeup_timeout = null;

          if (delta_ms > 0) {
            consumer.wakeup_timeout = setTimeout (() => {
              consumer.wakeup_timeout = null;
              this._onetime_pop (consumer);
            }, delta_ms);
          }
          else {
            setImmediate (() => this._onetime_pop (consumer));
          }
        }
      });
    });

    if (cb) cb ();
  }


  /////////////////////////////////////////
  // called when a pause/resume has been signaled
  signalPaused (paused, cb) {
    debug ('%s: signalPaused: received pause notif %s', this._name, paused ? 'true' : 'false');
    this._local_paused = paused;

    if (paused == false) {
      // run a wakeup on all consumers with or without wakeup timer set
      debug ('%s: signaPaused: waking up all consumers', this._name);

      this._consumers_by_tid.forEach ((consumer, tid) => {
        debug ('%s: signalPaused: waking up consumer %s', this._name, tid);

        if (consumer.wakeup_timeout) {
          clearTimeout (consumer.wakeup_timeout);
          consumer.wakeup_timeout = null;
        }

        setImmediate (() => this._onetime_pop (consumer));
      });
    }
    else {
      this._consumers_by_tid.forEach ((consumer_data, tid) => {
        debug ('%s: pausing tid %s (cid %s)', this._name, tid, consumer_data.cid);

        if (consumer_data.wakeup_timeout) {
          clearTimeout (consumer_data.wakeup_timeout);
          consumer_data.wakeup_timeout = null;
        }
      });
    }

    if (cb) cb ();
  }


  ////////////////////////////////////////
  // pause/resume
  pause (v) {
    if (v == undefined) v = true;
    this._stats.paused (v, () => this._signaller.signalPaused (v));
  }


  //////////////////////////////////
  // empty local buffers
  drain (callback) {
    debug ('%s: draining queue', this._name);
    this._in_drain = false;
    this._drained = true;
    this.cancel ();
    setImmediate (callback);
  }


  /////////////////////////////////////////
  // add element to queue
  push (payload, opts, callback) {
  /////////////////////////////////////////
    if (!callback) {
      callback = opts;
      opts = {};
    }

    if (this._in_drain) return setImmediate (() => {
      debug ('%s: push while in drain, return error', this._name);
      callback ('drain');
    });

    // get delay from either params or config
    var mature = null;

    if (opts.mature) {
      mature = new Date (opts.mature * 1000);
    }
    else {
      var delay = opts.delay || this.delay;
      mature = delay ? Queue.nowPlusSecs (delay) : Queue.now ();
    }

    // build payload
    var msg = {
      mature  : mature,
      payload  : payload,
      tries: opts.tries || 0
    };

    debug ('%s: about to insert %o', this._name, msg);

    // insert into queue
    this.insert (msg, (err, result) => {
      if (err) {
        debug ('%s: push : error when pushing elem: %o', this._name, err);
        return callback (err);
      }

      this._stats.incr ('put');
      this._signal_insertion (mature);

      debug ('%s: elem pushed, given id %s, signalled insertion with mature %s', this._name, result, mature.toISOString ());
      callback (null, result);
    })
  }


  //////////////////////////////////
  // obtain element from queue
  pop (cid, opts, callback) {
    // TODO fail if too many consumers?

    if (this._drained) return setImmediate (() => {
      debug ('%s: pop while drained, return error', this._name);
      if (callback) callback ('drain');
    });

    if (!callback) {
      callback = opts;
      opts = {};
    }

    if (!opts) {
      opts = {};
    }

    var tid = opts.tid || uuid.v4 ();

    var consumer_data = {
      tid: tid,               // unique id for this transaction
      cid: cid,
      since: new Date (),     // timestamp of creation of the consumer
      reserve: opts.reserve,  // boolean, is a reserve or a plain pop?
      callback: callback,     // final, outbound callback upon read/timeout
      cleanup_timeout: null,  // timer for timeout cancellation
      wakeup_timeout: null     // timer for rearming, awaiting data available
    };

    if (opts.timeout) {
      consumer_data.cleanup_timeout = setTimeout (() => {
        debug ('%s: pop: timed out %d msecs on transaction %s', this._name, opts.timeout, tid);
        consumer_data.cleanup_timeout = null;

        if (consumer_data.wakeup_timeout) {
          clearTimeout (consumer_data.wakeup_timeout);
          consumer_data.wakeup_timeout = null;
        }

        this._consumers_by_tid.delete (consumer_data.tid);

        if (consumer_data.callback) consumer_data.callback ({
          timeout: true,
          tid: consumer_data.tid,
          since: consumer_data.since
        });
      }, opts.timeout);
    }

    this._consumers_by_tid.set (tid, consumer_data);

    // end here if paused
    if (this._local_paused == undefined) {
      debug ('%s: local_paused undefined, read it from stats', this._name);

      this._stats.paused ((err, v) => {
        this._local_paused = v;

        debug ('%s: local_paused undefined, read paused status from stats:', this._name, v);

        if (!this._local_paused) {
          // attempt a read
          debug ('%s: pop: calling initial onetime_pop on cid %s, tid %s', this._name, cid, tid);
          this._onetime_pop (consumer_data);
        }
        else {
          debug ('%s: pop: queue paused for cid %s, tid %s', this._name, cid, tid);
        }
      });

      return tid;
    }
    else {
      if (!this._local_paused) {
        // attempt a read
        debug ('%s: pop: calling initial onetime_pop on cid %s, tid %s', this._name, cid, tid);
        this._onetime_pop (consumer_data);
      }
      else {
        debug ('%s: pop: queue paused for cid %s, tid %s', this._name, cid, tid);
      }

      return tid;
    }
  }


  //////////////////////////////////
  // high level commit
  ok (obj, cb) {
    // allow commit with either _id of full object
    if (obj._id) {
      this.commit (obj._id, cb);
    }
    else {
      this.commit (obj, cb);
    }
  }


  //////////////////////////////////
  // high level rollback
  ko (obj, next_t, cb) {
    if (_.isFunction (next_t)) {
      cb = next_t;
      next_t = null;
    }

    // allow rollback with either _id of full object
    let id = (obj._id ? obj._id : obj);

    if (
      (obj.tries) &&
      (this._factory.deadletter_queue ()) &&
      (this._factory.max_ko ()) &&
      (obj.tries > this._factory.max_ko ())
    ) {
      debug ('%s: too many retries (%d), moving to deadletter', obj._id, obj.tries);
      this._move_to_deadletter (obj, cb);
    }
    else {
      this.rollback (id, next_t, (err, res) => {
        if (err) {
          debug ('%s: ko : error when rolling back tid %s: %o', this._name, id, err);
          return cb (err);
        }

        if (res) {
          var t = new Date (next_t || null);
          debug ('%s: ko : tid %s rolled back, new mature is %s', this._name, id, t);
          this._signal_insertion (t);
        }

        cb (null, res);
      });
    }
  }


  //////////////////////////////////
  // cancel a waiting consumer
  cancel (tid) {
   debug ('%s: cancelling tid %s', this._name, tid);

    if (tid) {
      let consumer_data = this._consumers_by_tid.get (tid);

      if (!consumer_data) {
        // tid does not point to valid consume, NOOP
        return;
      }

      if (consumer_data.callback) {
        // call callback with error-cancelled
        consumer_data.callback ('cancel');

        // mark cancelled by deleting callback
        consumer_data.callback = null;
      }

      // clear timeout if present
      if (consumer_data.cleanup_timeout) {
        clearTimeout (consumer_data.cleanup_timeout);
        consumer_data.cleanup_timeout = null;
      }

      if (consumer_data.wakeup_timeout) {
        clearTimeout (consumer_data.wakeup_timeout);
        consumer_data.wakeup_timeout = null;
      }

      // remove from map
      this._consumers_by_tid.delete (tid);
    }
    else {
      // cancel all pending stuff
      this._consumers_by_tid.forEach ((consumer_data, tid) => {
        debug ('%s: cancelling tid %s (cid %s): start', this._name, tid, consumer_data.cid);

        if (consumer_data.callback) {
          // call callback with error-cancelled
          consumer_data.callback ('cancel');

          // mark cancelled by deleting callback
          consumer_data.callback = null;

          debug ('%s: cancelling tid %s (cid %s): callback called and removed', this._name, tid, consumer_data.cid);
        }

        if (consumer_data.cleanup_timeout) {
          clearTimeout (consumer_data.cleanup_timeout);
          consumer_data.cleanup_timeout = null;
          debug ('%s: cancelling tid %s (cid %s): cleanup timeout removed', this._name, tid, consumer_data.cid);
        }

        if (consumer_data.wakeup_timeout) {
          clearTimeout (consumer_data.wakeup_timeout);
          consumer_data.wakeup_timeout = null;
          debug ('%s: cancelling tid %s (cid %s): wakeup timeout removed', this._name, tid, consumer_data.cid);
        }

        debug ('%s: cancelling tid %s (cid %s): end', this._name, tid, consumer_data.cid);
      });

      this._consumers_by_tid.clear();
    }
  }


  //////////////////////////////////
  status (cb) {
  //////////////////////////////////
    async.parallel ({
      type:          cb => cb (null, this.type()),
      stats:         cb => this.stats (cb),
      topology:      cb => this.topology (cb),
      paused:        cb => this.paused (cb),
      next_mature_t: cb => this.next_t (cb),
      size:          cb => this.size (cb),
      totalSize:     cb => this.totalSize (cb),
      schedSize:     cb => this.schedSize (cb),
      resvSize:      cb => this.resvSize (cb)
    }, cb);
  }


  ///////////////////////////////////////////////////////////////////////////////
  // private parts


  _onetime_pop (consumer) {
    var getOrReserve_cb = (err, result) => {
      debug ('%s - tid %s: called getOrReserve_cb : err %o, result %o', this._name, consumer.tid, err, result);

      if (!consumer.callback) {
        // consumer was cancelled mid-flight
        // do not reinsert if it's using reserve
        if (!(consumer.reserve)) {
          return this._reinsert (result);
        }
      }

      // TODO eat up errors?
      if (err) {
        // get/reserve in error
        debug ('%s - tid %s: getOrReserve_cb in error: err %o', this._name, consumer.tid, err);

        // clean timeout timer
        if (consumer.cleanup_timeout) {
          clearTimeout (consumer.cleanup_timeout);
          consumer.cleanup_timeout = null;
        }

        // remove consumer from map
        this._consumers_by_tid.delete (consumer.tid);

        // call final callback
        if (consumer.callback) consumer.callback (err);
        return;
      }

      if (!result) {
        // queue is empty or non-mature: put us to sleep, to-rearm-in-future
        debug ('%s - tid %s: getOrReserve_cb no result, setting wakeup', this._name, consumer.tid);

        // clear this._next_mature_t if it's in the past
        if (this._next_mature_t && (this._next_mature_t < new Date().getTime ())) {
          debug ('%s - tid %s: getOrReserve_cb no result, and this._next_mature_t is in the past, clearing it', this._name, consumer.tid);
          this._next_mature_t = null;
        }

        // obtain time to sleep (capped)
        this._nextDelta (delta_ms => {
          // TODO cancel previous wakeup_timeout if not null?
          debug ('%s - tid %s: getOrReserve_cb : set wakeup in %d ms', this._name, consumer.tid, delta_ms);

          consumer.wakeup_timeout = setTimeout (() => {
            debug ('%s - tid %s: wakey wakey... calling onetime_pop', this._name, consumer.tid);
            consumer.wakeup_timeout = null;
            this._onetime_pop (consumer);
          }, delta_ms);
        });

        return;
      }

      // got an element
      this._next_mature_t = null;
      this._stats.incr ('get');

      debug ('%s - tid %s: getOrReserve_cb : got result %j', this._name, consumer.tid, result);

      // clean timeout timer
      if (consumer.cleanup_timeout) {
        clearTimeout (consumer.cleanup_timeout);
        consumer.cleanup_timeout = null;
      }

      // remove consumer from map
      this._consumers_by_tid.delete (consumer.tid);

      // call final callback
      if (consumer.callback) consumer.callback (null, result);
      return;
    };

    if (consumer.reserve) {
      this.reserve (getOrReserve_cb);
    }
    else {
      this.get (getOrReserve_cb);
    }
  }


  /////////////////////////////
  _nextDelta (cb) {
  /////////////////////////////
    if (this._next_mature_t == 0) {
      debug ('%s: _nextDelta:  _next_mature_t is zero, serving default', this._name);
      return cb (this._pollInterval);
    }

    if (_.isNull (this._next_mature_t)) {
      // there's no precalculated value, get it from backend
      debug ('%s: _nextDelta: null _next_mature_t, getting it from backend',this._name);

      this.next_t ((err, res) => {
        if (err) {
          debug ('%s: _nextDelta error from backend, serving default', this._name);
          return cb (this._pollInterval);
        }

        if (res) {
          // got a res, use it
          this._next_mature_t = res;
          var delta = res - Queue.now ().getTime();
          if (delta > this._pollInterval) delta = this._pollInterval;
          debug ('%s: _nextDelta: _next_mature_t from backend is %d, calc delta is %d', this._name, res, delta);
          return cb (delta);
        }
        else {
          // no res, set _next_mature_t to 0, serve default
          debug ('%s: _nextDelta: no _next_mature_t from backend, use default', this._name);
          this._next_mature_t = 0;
          return cb (this._pollInterval);
        }
      });
    }
    else {
      // _next_mature_t is non-zero numeric, use it
      var delta = this._next_mature_t - Queue.now ().getTime();
      if (delta > this._pollInterval) delta = this._pollInterval;
      if (delta < 0) delta = 0;

      debug ('%s: _nextDelta: using _next_mature_t %s, calc delta is %d', this._name, new Date(this._next_mature_t).toISOString (), delta);

      return cb (delta);
    }
  }


  ///////////////////////////////////////////////////////////
  _reinsert (result) {
    if (result) {
      debug ('%s: reinserting element', this._name);

      this.insert (result, (err, r) => {
        if (err) {
          debug ('%s: error while reinserting elem: %o', this._name, err);
        }
        else {
          this._signal_insertion (result.mature);
        }
      });
    }
  }


  ////////////////////////////////////////
  _signal_insertion (t) {
    this._signaller.signalInsertion (t);
  }


  /////////////////////////////////////////////
  _move_to_deadletter (obj, cb) {
    // commit and move to deadletter
    // ALSO NOT IN deadletter queue (to void loop)
    // commit element in origin queue, push in deadletter afterwards
    this.commit (obj._id, err => {
      if (err) {
        debug ('while committing %s prior to moving to deadletter: %j', obj._id, err);
        return cb (err);
      }

      this._factory.deadletter_queue ().push (obj.payload, (err, res) => {
        if (err) {
          debug ('while moving %s to deadletter: %j', obj._id, err);
          return cb (err);
        }
        else {
          debug ('moved %s to deadletter with _id %s', obj._id, res);
          return cb (null, false);
        }
      });
    });
  }
}


module.exports = Queue;
