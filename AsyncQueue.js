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
    
    // list of waiting consumers
    this._consumers_by_order = [];
    this._consumers_by_tid = new Map();
    
    this._getOrFail_timeout = null;
    
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
        cid: value.cid,
        tid: value.tid,
        since: value.since,
        callback: (value.callback ? 'set' : 'unset'),
        cleanup_timeout: (value.cleanup_timeout ? 'set' : 'unset')
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
    if (this._next_mature_t && (this._next_mature_t <= mature.getTime ())) {
    // ('put: this msg mature (%s) is set to after _next_mature (%s). Not triggering any get', mature, this._next_mature_t)
    }
    else {
      this._next_mature_t = mature.getTime ();
      
      if (this._getOrFail_timeout) {
        clearTimeout (this._getOrFail_timeout);
        // _getOrFail_timeout was set, cancelled
      }
      
      // re-trigger _getOrFail
      this._getOrFail ();
    }
    
    if (cb) cb ();
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
    
    var self = this;
    
    // insert into queue
    this.insert (msg, function (err, result) {
      if (err) {
        return callback (err);
      }
      
      self._stats.incr ('put');
      self._signaller.signalInsertion (mature);
      callback (null, result.insertedId);
    })
  }
  
  
  //////////////////////////////////
  // obtain element from queue
  pop (cid, opts, callback) {
  //////////////////////////////////
    // TODO fail if too many consumers
    if (!callback) {
      callback = opts;
      opts = {};
    }
    
    if (!opts) {
      opts = {};
    }
    
    var tid = opts.tid || uuid.v4 ();
    var consumer_data = {
      cid: cid,
      tid: tid,
      since: new Date (),
      reserve: opts.reserve,
      callback: callback
    };
    
    var self = this;
    
    if (opts.timeout) {
      consumer_data.cleanup_timeout = setTimeout (function () {
        // ('get: timed out %d msecs on consumer %s', opts.timeout, cid);
        consumer_data.callback = null;
        self._consumers_by_tid.delete (consumer_data.tid);

        callback ({
          timeout: true, 
          cid: consumer_data.cid, 
          tid: consumer_data.tid,
          since: consumer_data.since
        });
      }, opts.timeout)
    }
    
    this._consumers_by_order.push (consumer_data);
    this._consumers_by_tid.set (tid, consumer_data);

    if (this._getOrFail_timeout) {
      clearTimeout (this._getOrFail_timeout);
    }
    
    this._getOrFail ();
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


  /////////////////////////////
  _nextDelta (cb) {
  /////////////////////////////
    if (!this._next_mature_t) {
      // there's no precalculated value, get it from backend
      var self = this;

      this.next_t (function (err, res) {
        if (err) return cb (this._pollInterval);

        if (res) {
          self._next_mature_t = res;
          var delta = res - Queue.now ().getTime();
          if (delta > self._pollInterval) delta = self._pollInterval;
          return cb (delta);
        }
        else {
          return cb (self._pollInterval);
        }
      });
    }
    else {
      var delta = this._next_mature_t - Queue.now ().getTime();
      if (delta > this._pollInterval) delta = this._pollInterval;

      return cb (delta);
    }
  }
  
  
  //////////////////////////////////
  // return consumer to wset and rearm _getOrFail_timeout
  _rearm_getOrFail (consumer) {
  //////////////////////////////////
    // queue is empty or non-mature: push consumer again
    if (consumer) {
      this._consumers_by_order.push (consumer);
    }
    
    // rearm 
    if (!this._getOrFail_timeout) {
      clearTimeout (this._getOrFail_timeout);
    }
     
    var self = this;
    this._nextDelta (function (delta) {
      self._getOrFail_timeout = setTimeout (function () {self._getOrFail ()}, delta);
    });
  }
  
  
  ///////////////////////////////////////////////////////////
  _reinsertAndRearm (result, consumer) {
  ///////////////////////////////////////////////////////////
    if (result) {
      var self = this;
      this.insert (result, function (err, r) {
        if (err) {
        }

        if ((!self._next_mature_t) || (self._next_mature_t > result.mature.getTime ())) {
          self._next_mature_t = result.mature.getTime ();
        }

        self._rearm_getOrFail (consumer);
      });
    }
    else {
      this._rearm_getOrFail (consumer);
    }
  }
  
  
  //////////////////////////////////
  // obtain element from queue
  _getOrFail () {
  //////////////////////////////////
    // seeks an returns one element from the queue to the top of the waitinglist 
    // Only those whose maturity time is in the past are take into account, 
    // and we get the newest of them all

    this._getOrFail_timeout = null;
    
    if (this._consumers_by_order.length == 0) {
      // no consumers waiting
      return;
    }
    
    let consumer = this._consumers_by_order.shift ();

    while (!consumer.callback) {
      //  consumer already timed out or has been cancelled, ignoring it...
      
      if (this._consumers_by_order.length == 0) {
        // no consumers waiting
        return;
      }
      
      consumer = this._consumers_by_order.shift ();
    }
    
    var self = this;
    var getOrReserve_cb = function (err, result) {
      self._next_mature_t = null;

      if (!consumer.callback) {
        // consumer was cancelled mid-flight

        // do not reinsert if it's using reserve
        if (!(consumer.reserve)) {
          return self._reinsertAndRearm (result);
        }
      }
      
      // TODO eat up errors?
      if (err) {
        if (consumer.cleanup_timeout) {
          clearTimeout (consumer.cleanup_timeout);
          consumer.cleanup_timeout = null;
        }
      
        // remove from map
        self._consumers_by_tid.delete (consumer.tid);
        consumer.callback (err);
        
        if (self._getOrFail_timeout) {
          clearTimeout (self._getOrFail_timeout);
        }
        
        self._getOrFail ();
        return;
      }

      if (!result) {
        // queue is empty or non-mature: rearm
        return self._rearm_getOrFail (consumer);
      }
      
      // got an element
      var delta = result.mature.getTime() - Queue.now ().getTime();
      self._stats.incr ('get');
        
      if (consumer.cleanup_timeout) {
        clearTimeout (consumer.cleanup_timeout);
        consumer.cleanup_timeout = null;
      }
        
      // remove from map
      self._consumers_by_tid.delete (consumer.tid);
      consumer.callback (null, result);  

      if (self._getOrFail_timeout) {
        clearTimeout (self._getOrFail_timeout);
      }
        
      self._getOrFail ();
      return;
    }
    
    if (consumer.reserve) {
      this.reserve (getOrReserve_cb);
    }
    else {
      this.get (getOrReserve_cb);
    }
  }
};


module.exports = AsyncQueue;
