'use strict';

var async = require ('async');
var _ =     require ('lodash');
var uuid =  require ('uuid');

var debug = require('debug')('keuss:Queue');


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
    this._stats.opts (__opts, function () {});

    this._stats.incr ('get', 0);
    this._stats.incr ('put', 0);

    // if true, queue is being drained just before shutdown
    this._in_drain = false;

    // if true, queue has been drained and is now not usable
    this._drained = false;

    debug ('created queue %s', this._name);
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
  
  // Date of next 
  next_t (callback) {callback (null, null);}

  // end of expected redefinitions on subclasses
  ////////////////////////////////////////////////////////////////////////////
  
  stats    (cb) {this._stats.values (cb);}
  topology (cb) {this._stats.topology (cb);}
    
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
    
    this._consumers_by_tid.forEach (function (value, key) {
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
  /////////////////////////////////////////
    if (_.isNull (this._next_mature_t)) {
      // totally ignore it, let pop() get it via next_t()
      debug ('%s: signalInsertion received signalled insertion with mature %s. _next_mature_t is null, ignoring', this._name, mature.toISOString ());
      if (cb) return cb ();
      else return;
    }
    else if (this._next_mature_t == 0) {
      // next_t() forced a read and the result was 'empty': trust the notif
      debug ('%s: signalInsertion received signalled insertion with mature %s. _next_mature_t is 0, trusting notif', this._name, mature.toISOString ());
      this._next_mature_t = mature.getTime ();
    }
    else if (this._next_mature_t <= mature.getTime ()) {
      // _next_mature_t is numeric and non-null, so an active wait is happening. ignore it 
      debug ('%s: signalInsertion received signalled insertion with mature %s. _next_mature_t (%s) is lower, ignoring', this._name, mature.toISOString (), new Date(this._next_mature_t).toISOString());
      if (cb) return cb ();
      else return;
    }
    else {
      // _next_mature_t is numeric and non-null, so an active wait is happening. ignore it 
      debug ('%s: signalInsertion received signalled insertion with mature %s. _next_mature_t (%s) is higher, trusting notif', this._name, mature.toISOString (), new Date(this._next_mature_t).toISOString());
      this._next_mature_t = mature.getTime ();
    }

    var self = this;
    this._nextDelta (function (delta_ms) {
      // run a wakeup on all consumers with the wakeup timer set
    //console.log ('%s - %s: signalInsertion sees that the delta_ms is now %d', new Date().toISOString(), self._name, delta_ms);
//    //console.log ('%s - %s: signalInsertion : consumers:  %d', new Date().toISOString(), self._name, self.nConsumers());
        
      self._consumers_by_tid.forEach (function (consumer, tid) {
//      //console.log ('%s - %s: signalInsertion checking wakeup state for consumer %j', new Date().toISOString(), self._name, consumer);
          
        if (consumer.wakeup_timeout) {
//        //console.log ('%s - %s: signalInsertion rescheduling consumer %j', new Date().toISOString(), self._name, consumer);
            
          clearTimeout (consumer.wakeup_timeout);
          consumer.wakeup_timeout = null;

          if (delta_ms > 0) {
            consumer.wakeup_timeout = setTimeout (
              function () {
                consumer.wakeup_timeout = null;
                self._onetime_pop (consumer);
              },
              delta_ms
            );

          //console.log ('%s - %s: signalInsertion rescheduled consumer %j', new Date().toISOString(), self._name, consumer);
          }
          else {
            setImmediate (function () {self._onetime_pop (consumer)});
          //console.log ('%s - %s: signalInsertion immediately waking up consumer %j', new Date().toISOString(), self._name, consumer); 
          } 
        }
      });
    });

    if (cb) cb ();
  }
  

  //////////////////////////////////
  // empty local buffers
  drain (callback) {
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
    
    if (this._in_drain) return setImmediate (function () {callback ('drain');});
    
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
    }

    debug ('%s: about to insert %o', this._name, msg);

    var self = this;
    
    // insert into queue
    this.insert (msg, function (err, result) {
      if (err) {
        return callback (err);
      }
      
      self._stats.incr ('put');
      self._signaller.signalInsertion (mature);
      debug ('%s: signalled insertion with mature %s', this._name, mature.toISOString ());
      callback (null, result.insertedId);
    })
  }
  
  
  //////////////////////////////////
  // obtain element from queue
  pop (cid, opts, callback) {
  //////////////////////////////////
    // TODO fail if too many consumers?
    
    if (this._drained) return setImmediate (function () {callback ('drain');});

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
      since: new Date (),     // timestamp of creation of the consumer
      reserve: opts.reserve,  // boolean, is a reserve or a plain pop?
      callback: callback,     // final, outbound callback upon read/timeout
      cleanup_timeout: null,  // timer for timeout cancellation
      wakeup_timeout: null     // timer for rearming, awaiting data available
    };
    
    var self = this;
    
    if (opts.timeout) {
      consumer_data.cleanup_timeout = setTimeout (function () {
        debug ('%s: get: timed out %d msecs on transaction %s', self._name, opts.timeout, tid);
        consumer_data.cleanup_timeout = null;

        if (consumer_data.wakeup_timeout) {
          clearTimeout (consumer_data.wakeup_timeout);
          consumer_data.wakeup_timeout = null;
        }

        self._consumers_by_tid.delete (consumer_data.tid);

        if (consumer_data.callback) consumer_data.callback ({
          timeout: true, 
          tid: consumer_data.tid,
          since: consumer_data.since
        });
      }, opts.timeout)
    }
    
    this._consumers_by_tid.set (tid, consumer_data);

    // attempt a read
    debug ('%s: calling initial onetime_pop on %j', self._name, consumer_data)
    this._onetime_pop (consumer_data);

    return tid;
  }
  
  
  //////////////////////////////////
  // high level commit
  ok (id, cb) {
    this.commit (id, cb);
  }
  
  
  //////////////////////////////////
  // high level rollback
  ko (id, next_t, cb) {
    if (_.isFunction (next_t)) {
      cb = next_t;
      next_t = null;
    }

    var self = this;
    
    this.rollback (id, next_t, function (err, res) {
      if (err) {
        return cb (err);
      }
      
      if (res) {
        var t = new Date (next_t || null);
        debug ('%s: ko : tid %s rolled back, new mature is %s', self._name, id, t);
      
        // signal correct time
        self._signaller.signalInsertion (t);
      }
      
      cb (null, res);
    });
  }
  
  
  //////////////////////////////////
  // cancel a waiting consumer
  cancel (tid) {
  //////////////////////////////////
    console.log ('%s: cancelling, tid is ', this._name, tid);

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
      var self = this;
      this._consumers_by_tid.forEach (function (consumer_data, tid) {
        debug ('%s: cancelling %s', self._name, tid);

        if (consumer_data.callback) {
          // call callback with error-cancelled
          consumer_data.callback ('cancel');

          // mark cancelled by deleting callback
          consumer_data.callback = null;
        }

        if (consumer_data.cleanup_timeout) {
          clearTimeout (consumer_data.cleanup_timeout);
          consumer_data.cleanup_timeout = null;
        }
       
        if (consumer_data.wakeup_timeout) {
          clearTimeout (consumer_data.wakeup_timeout);
          consumer_data.wakeup_timeout = null;
        }
      });

      this._consumers_by_tid.clear();
    }
  }


  //////////////////////////////////
  status (cb) {
  //////////////////////////////////
    var self = this;
      
    async.parallel ({
      type:          function (cb) {cb (null, self.type())},
      stats:         function (cb) {self.stats (cb)},
      topology:      function (cb) {self.topology (cb)},
      next_mature_t: function (cb) {self.next_t (cb)},
      size:          function (cb) {self.size (cb)},
      totalSize:     function (cb) {self.totalSize (cb)},
      schedSize:     function (cb) {self.schedSize (cb)}
    }, cb);
  }
  
  
  ///////////////////////////////////////////////////////////////////////////////
  // private parts


  _onetime_pop (consumer) {
    var self = this;
    var getOrReserve_cb = function (err, result) {
    debug ('%s - %s: called getOrReserve_cb : err %o, result %o', self._name, consumer.tid, err, result);
      
      if (!consumer.callback) {
        // consumer was cancelled mid-flight
        // do not reinsert if it's using reserve
        if (!(consumer.reserve)) {
          return self._reinsert (result);
        }
      }
      
      // TODO eat up errors?
      if (err) {
        // get/reserve in error
        debug ('%s - %s: getOrReserve_cb in error: err %o', self._name, consumer.tid, err);

        // clean timeout timer
        if (consumer.cleanup_timeout) {
          clearTimeout (consumer.cleanup_timeout);
          consumer.cleanup_timeout = null;
        }
      
        // remove consumer from map
        self._consumers_by_tid.delete (consumer.tid);

        // call final callback
        if (consumer.callback) consumer.callback (err);
        return;
      }

      if (!result) {
        // queue is empty or non-mature: put us to sleep, to-rearm-in-future
    
        debug ('%s - %s: getOrReserve_cb no result, setting wakeup', self._name, consumer.tid);

        // clear this._next_mature_t if it's in the past
        if (self._next_mature_t && (self._next_mature_t < new Date().getTime ())) {
         debug ('%s - %s: getOrReserve_cb no result, and self._next_mature_t is in the past, clearing it', self._name);

          self._next_mature_t = null;
        }

        // obtain time to sleep (capped)
        self._nextDelta (function (delta_ms) {
          // TODO cancel previous wakeup_timeout if not null?
          debug ('%s - %s: getOrReserve_cb : set wakeup in %d ms', self._name, consumer.tid, delta_ms);

          consumer.wakeup_timeout = setTimeout (
            function () {
              debug ('%s - %s: wakey wakey... calling onetime_pop', self._name, consumer.tid);
              consumer.wakeup_timeout = null;
              self._onetime_pop (consumer);
            },
            delta_ms
          ); 
        });

        return;
      }
      
      // got an element
      self._next_mature_t = null;
      self._stats.incr ('get');

      debug ('%s - %s: getOrReserve_cb : got result %j', self._name, consumer.tid, result);

      // clean timeout timer
      if (consumer.cleanup_timeout) {
        clearTimeout (consumer.cleanup_timeout);
        consumer.cleanup_timeout = null;
      }
        
      // remove consumer from map
      self._consumers_by_tid.delete (consumer.tid);

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
      var self = this;

      this.next_t (function (err, res) {
        if (err) {
          debug ('%s: _nextDelta error from backend, serving default', self._name);
          return cb (self._pollInterval);
        }

        if (res) {
          // got a res, use it
          self._next_mature_t = res;
          var delta = res - Queue.now ().getTime();
          if (delta > self._pollInterval) delta = self._pollInterval;
          debug ('%s: _nextDelta: _next_mature_t from backend is %d, calc delta is %d', self._name, res, delta);
          return cb (delta);
        }
        else {
          // no res, set _next_mature_t to 0, serve default
          debug ('%s: _nextDelta: no _next_mature_t from backend, use default', self._name);
          self._next_mature_t = 0;
          return cb (self._pollInterval);
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
  ///////////////////////////////////////////////////////////
    if (result) {
      var self = this;
      this.insert (result, function (err, r) {
        if (err) {
        }
        else {
          self._signaller.signalInsertion (result.mature);
        }
      });
    }
  }
};


module.exports = Queue;
