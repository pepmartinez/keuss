'use strict';

var async = require ('async');
var _ =     require ('lodash');
var uuid =  require ('uuid');

var Queue = require ('./Queue');
var LocalSignal = require ('./signal/local');


class AsyncQueue extends Queue {
  
  //////////////////////////////////////////////
  constructor (name, opts) {
  //////////////////////////////////////////////
    super (name, opts);

    // defaults
    this._pollInterval = this._opts.pollInterval || 60000;
    
    // map of active consumers
    this._consumers_by_tid = new Map();
    
    // signaller
    if (!this._opts.signaller) {
      this._opts.signaller = {}
    }
    
    if (!this._opts.signaller.opts) {
      this._opts.signaller.opts = {}
    }
    
    var signaller_factory = this._opts.signaller.provider || new LocalSignal ();
    this._signaller = signaller_factory.signal (this, this._opts.signaller.opts);
    
    this._stats.incr ('get', 0);
    this._stats.incr ('put', 0);
  }

  
  ////////////////////////////////////////////////////////////////////////////
  // expected redefinitions on subclasses
  
  // add element to queue
  insert (entry, callback) {callback (null, null)}
  
  // get element from queue
  get (callback) {callback (null, {mature: 0, payload: null, tries: 0})}
  
  // reserve element: call cb (err, pl) where pl has an id
  reserve (callback) {callback (null, {mature: 0, payload: null, tries: 0}, null)}
  
  // commit previous reserve, by p.id: call cb (err, true|false), true if element committed
  commit (id, callback) {callback (null, false)}
  
  // rollback previous reserve, by p.id: call cb (err, true|false), true if element rolled back
  rollback (id, callback) {callback (null, false)}

  // pipeline: atomically passes to next queue a previously reserved element, by id
  next (id, next_queue, opts, callback) {callback (null, false)}

  // queue size including non-mature elements
  totalSize (callback) {callback (null, 0)}
  
  // queue size NOT including non-mature elements
  size (callback) {callback (null, 0)}
  
  // queue size of non-mature elements only
  schedSize (callback) {callback (null, 0)}
  
  // Date of next 
  next_t (callback) {callback (null, null)}
  
  // end of expected redefinitions on subclasses
  ////////////////////////////////////////////////////////////////////////////
  
  
  /////////////////////////////////////////
  type () {
  /////////////////////////////////////////
    return 'queue:async';
  }
  
  
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
    
    // console.log ('%s: signalInsertion received signalled insertion with mature %s', new Date().toISOString(), mature.toISOString ());

    if (this._next_mature_t && (this._next_mature_t <= mature.getTime ())) {
      // console.log ('%s: signalInsertion, this msg mature (%s) is set to after _next_mature (%s). Not triggering any get', new Date().toISOString(), mature, new Date(this._next_mature_t).toISOString())
      if (cb) cb ();
    }
    else {
      // console.log ('%s: signalInsertion about to wake up sleepers', new Date().toISOString());
      this._next_mature_t = mature.getTime ();
      
      var self = this;
      this._nextDelta (function (delta_ms) {
        // run a wakeup on all consumers with the wakeup timer set
        // console.log ('%s: signalInsertion sees that the delta_ms is now %d', new Date().toISOString(), delta_ms);
        // console.log ('%s: signalInsertion : cosumers:  %d', new Date().toISOString(), self.nConsumers());
        self._consumers_by_tid.forEach (function (consumer, tid) {
          // console.log ('%s: signalInsertion checking wakeup state for consumer %j', new Date().toISOString(), consumer);
          if (consumer.wakeup_timeout) {
            // console.log ('%s: signalInsertion rescheduling consumer %j', new Date().toISOString(), consumer);
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

              // console.log ('%s: signalInsertion rescheduled consumer %j', new Date().toISOString(), consumer);
            }
            else {
              setImmediate (function () {self._onetime_pop (consumer)});
              // console.log ('%s: signalInsertion immediately waking up consumer %j', new Date().toISOString(), consumer); 
            } 
          }
        });
      });

      if (cb) cb ();
    }
  }
  
  
  /////////////////////////////////////////
  // add element to queue
  push (payload, opts, callback) {
  /////////////////////////////////////////
    if (!callback) {
      callback = opts;
      opts = {};
    }
    
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

    // console.log ('%s: about to insert %j', new Date().toISOString(), msg);

    var self = this;
    
    // insert into queue
    this.insert (msg, function (err, result) {
      if (err) {
        return callback (err);
      }
      
      self._stats.incr ('put');
      self._signaller.signalInsertion (mature);
      // console.log ('%s: signalled insertion with mature %s', new Date().toISOString(), mature.toISOString ());
      callback (null, result.insertedId);
    })
  }
  
  
  //////////////////////////////////
  // obtain element from queue
  pop (cid, opts, callback) {
  //////////////////////////////////
    // TODO fail if too many consumers?
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
        // console.log ('get: timed out %d msecs on transaction %s', opts.timeout, tid);
        consumer_data.cleanup_timeout = null;

        if (consumer_data.wakeup_timeout) {
          clearTimeout (consumer_data.wakeup_timeout);
          consumer_data.wakeup_timeout = null;
        }

        self._consumers_by_tid.delete (consumer_data.tid);

        consumer_data.callback ({
          timeout: true, 
          tid: consumer_data.tid,
          since: consumer_data.since
        });
      }, opts.timeout)
    }
    
    this._consumers_by_tid.set (tid, consumer_data);

    // attempt a read
    // console.log ('%s: calling initial onetime_pop on %j', new Date().toISOString(), consumer_data)
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
  ko (id, cb) {
    var self = this;
    
    this.rollback (id, function (err, res) {
      if (err) {
        return cb (err);
      }
      
      if (res) {
        self._signaller.signalInsertion (Queue.now ());
      }
      
      cb (null, res);
    });
  }
  
  
  //////////////////////////////////
  // cancel a waiting consumer
  cancel (tid, opts) {
  //////////////////////////////////
    let consumer_data = this._consumers_by_tid.get (tid);
    
    if (tid) {
      // mark cancelled by deleting callback
      consumer_data.callback = null;
      
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
  }

  
  //////////////////////////////////
  status (cb) {
  //////////////////////////////////
    var self = this;
    super.status (function (err, base_st) {
      if (err) {
        return cb (err);
      }
      
      async.parallel ({
        size:      function (cb) {self.size (cb)},
        totalSize: function (cb) {self.totalSize (cb)},
        schedSize: function (cb) {self.schedSize (cb)}
      }, function (err, r) {
        _.merge (base_st, r);
        cb (err, base_st);
      });
    });
  }
  
  
  ///////////////////////////////////////////////////////////////////////////////
  // private parts


  _onetime_pop (consumer) {
    var self = this;
    var getOrReserve_cb = function (err, result) {
      // console.log ('%s - %s: called getOrReserve_cb : err %j, result %j', new Date().toISOString(), consumer.tid, err, result);
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
        // console.log ('%s - %s: getOrReserve_cb in error: err %j', new Date().toISOString(), consumer.tid, err);

        // clean timeout timer
        if (consumer.cleanup_timeout) {
          clearTimeout (consumer.cleanup_timeout);
          consumer.cleanup_timeout = null;
        }
      
        // remove consumer from map
        self._consumers_by_tid.delete (consumer.tid);

        // call final callback
        consumer.callback (err);
        return;
      }

      if (!result) {
        // queue is empty or non-mature: put us to sleep, to-rearm-in-future
    
        // console.log ('%s - %s: getOrReserve_cb no result, setting wakeup', new Date().toISOString(), consumer.tid);

        // obtain time to sleep (capped)
        self._nextDelta (function (delta_ms) {
          // TODO cancel previous wakeup_timeout if not null?
          // console.log ('%s - %s: getOrReserve_cb : set wakeup in %d ms', new Date().toISOString(), consumer.tid, delta_ms);

          consumer.wakeup_timeout = setTimeout (
            function () {
              // console.log ('%s - %s: wakey wakey... calling onetime_pop', new Date().toISOString(), consumer.tid);
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

      // console.log ('%s - %s: getOrReserve_cb : got result %j', new Date().toISOString(), consumer.tid, result);

      // clean timeout timer
      if (consumer.cleanup_timeout) {
        clearTimeout (consumer.cleanup_timeout);
        consumer.cleanup_timeout = null;
      }
        
      // remove consumer from map
      self._consumers_by_tid.delete (consumer.tid);

      // call final callback
      consumer.callback (null, result);  
      return;
    }
    
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
    if (!this._next_mature_t) {
      // there's no precalculated value, get it from backend
      // console.log ('%s : _nextDelta has no available _next_mature_t, getting it from backend', new Date().toISOString());
      var self = this;

      this.next_t (function (err, res) {
        if (err) return cb (this._pollInterval);

        if (res) {
          self._next_mature_t = res;
          var delta = res - Queue.now ().getTime();
          if (delta > self._pollInterval) delta = self._pollInterval;
          // console.log ('%s : _nextDelta _next_mature_t from backend is %d, calc delta is %d', new Date().toISOString(), res, delta);
          return cb (delta);
        }
        else {
          // console.log ('%s : _nextDelta no _next_mature_t from backend, calc delta is %d', new Date().toISOString(), self._pollInterval);
          return cb (self._pollInterval);
        }
      });
    }
    else {
      // console.log ('%s : _nextDelta has available _next_mature_t %d', new Date().toISOString(), this._next_mature_t);
      var delta = this._next_mature_t - Queue.now ().getTime();
      if (delta > this._pollInterval) delta = this._pollInterval;

      // console.log ('%s : _nextDelta calc delta is %d', new Date().toISOString(), delta);

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


module.exports = AsyncQueue;
