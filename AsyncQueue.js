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
    this._pollInterval = this._opts.pollInterval || 15000;
    
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
    
    this._opts.signaller.opts.logger = this.logger();
    this._opts.signaller.opts.level = this.level();
    
    this._signaller = new (this._opts.signaller.provider || LocalSignal) (this, this._opts.signaller.opts);
    
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
      this._verbose  ('put: this msg mature (%s) is set to after _next_mature (%s). Not triggering any get', mature, this._next_mature_t)
    }
    else {
      this._next_mature_t = mature.getTime ();
      
      if (this._getOrFail_timeout) {
        clearTimeout (this._getOrFail_timeout);
        this._verbose  ('put: _getOrFail_timeout was set, cancelled')
      }
      
      this._verbose  ('put: re-triggering _getOrFail')
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
        self._verbose ('get: timed out %d msecs on consumer %s', opts.timeout, cid);

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
    
    this._verbose  ('get: added consumer %s (tid %s)', consumer_data.cid, consumer_data.tid);
    
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
      
      this._verbose  ('cancel: cancelled %s. consumers left waiting: %d, total consumers: %d', tid, this._consumers_by_order.length, this.nConsumers ());
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
  _nextDelta () {
  /////////////////////////////
    if (!this._next_mature_t) {
      this._verbose  ('_nextDelta: default delta is %d msecs', this._pollInterval);
      return this._pollInterval;
    }
      
    var delta = this._next_mature_t - Queue.now ().getTime();
    this._verbose  ('_nextDelta: explicit delta is %d msecs', delta);
    return delta;
  }
  
  
  //////////////////////////////////
  // return consumer to wset and rearm _getOrFail_timeout
  _rearm_getOrFail (consumer) {
  //////////////////////////////////
    // queue is empty: push consumer again
    if (consumer) {
      this._consumers_by_order.push (consumer);
      this._verbose  ('_rearm_getOrFail: consumer %s (tid %s) returned to wset', consumer.cid, consumer.tid);
      this._verbose  ('_rearm_getOrFail: consumers left waiting: %d, total consumers: %d', this._consumers_by_order.length, this.nConsumers ());
    }
    else {
      this._verbose  ('_rearm_getOrFail: no consumer to be returned to wset');
    }
    
    // rearm 
    if (!this._getOrFail_timeout) {
      clearTimeout (this._getOrFail_timeout);
    }
    
    var delta = this._nextDelta ();
    var self = this;
    this._getOrFail_timeout = setTimeout (function () {self._getOrFail ()}, delta);
    this._verbose  ('_rearm_getOrFail: _getOrFail rearmed, wait is %d', delta);
  }
  
  
  ///////////////////////////////////////////////////////////
  _reinsertAndRearm (result, consumer) {
  ///////////////////////////////////////////////////////////
    if (result) {
      this._verbose  ('_reinsertAndRearm: re-inserting non-mature %j', result, {});
      
      var self = this;
      this.insert (result, function (err, r) {
        if (err) {
          self._error  ('_reinsertAndRearm: err while reinserting non-mature: %s', err, {});
        }
        
        self._verbose  ('_reinsertAndRearm: re-inserted %j', result, {});
        
        self._verbose  ('_reinsertAndRearm: _next_mature_t was %d', self._next_mature_t);
        
        if ((!self._next_mature_t) || (self._next_mature_t > result.mature.getTime ())) {
          self._next_mature_t = result.mature.getTime ();
        }
        
        self._verbose  ('_reinsertAndRearm: _next_mature_t is now %d', self._next_mature_t);
        
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
    this._verbose  ('_getOrFail: enter, _getOrFail_timeout is %s', (this._getOrFail_timeout ? 'set' : 'unset'));
    
    this._getOrFail_timeout = null;
    
    if (this._consumers_by_order.length == 0) {
      // no consumers waiting
      this._verbose  ('_getOrFail: no consumers, end');
      return;
    }
    
    let consumer = this._consumers_by_order.shift ();
    this._verbose  ('_getOrFail: chose consumer %s (tid %s)', consumer.cid, consumer.tid);
    this._verbose  ('_getOrFail: consumers left waiting: %d, total consumers: %d', this._consumers_by_order.length, this.nConsumers ());

    while (!consumer.callback) {
      this._verbose  ('_getOrFail: chose consumer %j that already timed out or has been cancelled, ignoring it...', consumer, {});
      
      if (this._consumers_by_order.length == 0) {
        // no consumers waiting
        this._verbose  ('_getOrFail: no consumers, end');
        return;
      }
      
      consumer = this._consumers_by_order.shift ();
      this._verbose  ('_getOrFail: chose consumer %s (tid %s)', consumer.cid, consumer.tid);
      this._verbose  ('_getOrFail: consumers left waiting: %d, total consumers: %d', this._consumers_by_order.length, this.nConsumers ());
    }
    
    var self = this;
    var getOrReserve_cb = function (err, result) {
        self._verbose  ('_getOrFail: get res is %j', result, {});
      
      if (!consumer.callback) {
        // consumer was cancelled mid-flight
        self._verbose  ('_getOrFail: consumer %s (tid %s) was cancelled, ignoring it...', consumer.cid, consumer.tid);
        return self._reinsertAndRearm (result);
      }
      
      // TODO eat up errors?
      if (err) {
        self._error  ('_getOrFail: err %s', err, {});
        self._next_mature_t = null;

        if (consumer.cleanup_timeout) {
          clearTimeout (consumer.cleanup_timeout);
          consumer.cleanup_timeout = null;
        }
      
        // remove from map
        self._consumers_by_tid.delete (consumer.tid);
//        self._stats.decr ('consumers');
        consumer.callback (err);
        
        if (self._getOrFail_timeout) {
          clearTimeout (self._getOrFail_timeout);
        }
        
        self._getOrFail ();
        return;
      }
      
      if (!result) {
        // queue is empty: rearm
        self._next_mature_t = null;
        return self._rearm_getOrFail (consumer);
      }
      
      // got an element
      var delta = result.mature.getTime() - Queue.now ().getTime();
      self._verbose  ('_getOrFail: got an element, mature delta is %d msecs', delta);
      
      if (delta > 0) {
        // element not mature, reinsert & rearm
        self._verbose  ('_getOrFail: got an element, non-mature by %d msecs', delta);
        return self._reinsertAndRearm (result, consumer);
      }
      else {
        self._next_mature_t = null;
        self._verbose  ('_getOrFail: element is mature by %d msecs, return it', delta);
        self._stats.incr ('get');
        
        if (consumer.cleanup_timeout) {
          clearTimeout (consumer.cleanup_timeout);
          consumer.cleanup_timeout = null;
        }
        
        // remove from map
        self._consumers_by_tid.delete (consumer.tid);
//        self._stats.decr ('consumers');
        consumer.callback (null, result);  

        if (self._getOrFail_timeout) {
          clearTimeout (self._getOrFail_timeout);
        }
        
        self._getOrFail ();
        return;
      }
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
