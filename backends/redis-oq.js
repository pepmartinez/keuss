'use strict';

var async = require ('async');
var _ =     require ('lodash');
var redis = require ('redis');
var uuid =  require ('uuid');

var AsyncQueue =        require ('../AsyncQueue');
var RedisOrderedQueue = require ('../RedisOrderedQueue');


//////////////////////////////////////////////////////////////////
// static data
var _s_rediscl = undefined;
var _s_opts = undefined;


class RedisOQ extends AsyncQueue {
  
  //////////////////////////////////////////////
  constructor (name, opts) {
  //////////////////////////////////////////////
    if (!_s_rediscl) {
      throw new Error ('Redis not initialized, call init()');
    }
    
    super (name, opts);
    
    this._roq = new RedisOrderedQueue (this._name);
    
    this.setLevel ('verbose')
  }
  
  
  /////////////////////////////////////////
  static Type () {
  /////////////////////////////////////////
    return 'redis:oq';
  }

  
  /////////////////////////////////////////
  type () {
  /////////////////////////////////////////
    return 'redis:oq';
  }
  
  
  
  // TODO: reload scripts if fail (causd by redis restart or failover)
  
  /////////////////////////////////////////
  // add element to queue
  insert (entry, callback) {
  /////////////////////////////////////////
    var self = this;
    var pl = {
      payload: entry.payload,
      tries:   entry.tries
    };
    
    var id = entry.id || uuid.v4();
    var mature = entry.mature || Queue.now ();
    self._verbose  ('insert: id is %s, mature is %s', id, mature);
    
    this._roq.push (id, mature.getTime (), JSON.stringify (pl), function (err, res) {
      if (err) {
        return callback (err);
      }
      
      self._verbose  ('insert: inserted payload %j', pl, {});
      callback (null, res);
    });
  }
  
  
  /////////////////////////////////////////
  // get element from queue
  get (callback) {
  /////////////////////////////////////////
    var self = this;
    this._roq.pop (function (err, res) {
      if (err) {
        return callback (err);
      }
      
      // res is [id, mature, text]
      self._verbose  ('get: obtained %j', res, {});
      
      if (!res) {
        callback (null, null);
      }
      else {
        var pl = JSON.parse (res[2]);
        pl.mature = new Date (parseInt (res[1]));
        pl._id = res[0];
        self._verbose  ('get: final pl to return is %j', pl, {});
        callback (null, pl);
      }
    });
  }
  
  
  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback) {
  //////////////////////////////////
    this._roq.totalSize (callback);
  }
  
  
  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
  //////////////////////////////////
    this._roq.size (callback);
  }
  
  
  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
  //////////////////////////////////
    this._roq.schedSize (callback);
  }
  
  
  //////////////////////////////////
  // Date of next 
  next_t (callback) {
  //////////////////////////////////
    this._roq.peek (function (err, res) {
      if (err) {
        return callback (err);
      }
      
      if (res.length < 1) {
        return callback (null, null);
      }
      
      callback (null, new Date (parseInt (res[1])));
    });
  }


  ////////////////////////////////////////////////////////////////////////////////
  // statics
  
  //////////////////////////////////////////////////////////////////
  static init (opts, cb) {
  //////////////////////////////////////////////////////////////////
    _s_opts = opts;
    if (!_s_opts) _s_opts = {};
  
    _s_opts.retry_strategy = function (options) {
      console.log ('redis-oq: redis reconnect!', options)

      if (options.total_retry_time > 1000 * 60 * 60) {
        // End reconnecting after a specific timeout and flush all commands with a individual error 
        return new Error('Retry time exhausted');
      }
      
      // reconnect after 
      return Math.max(options.attempt * 100, 3000);
    }
    
    _s_rediscl = redis.createClient (_s_opts);
   
    _s_rediscl.on ('ready',        function ()    {console.log ('Redis-oq: rediscl ready')});
    _s_rediscl.on ('conenct',      function ()    {console.log ('Redis-oq: rediscl connect')});
    _s_rediscl.on ('reconnecting', function ()    {console.log ('Redis-oq: rediscl reconnecting')});
    _s_rediscl.on ('error',        function (err) {console.log ('Redis-oq: rediscl error: ' + err)});
    _s_rediscl.on ('end',          function ()    {console.log ('Redis-oq: rediscl end')});
    
    RedisOrderedQueue.init (_s_rediscl, cb);
  }
  
  
  //////////////////////////////////////////////////////////////////
  static end (cb) {
  //////////////////////////////////////////////////////////////////
    if (_s_rediscl) _s_rediscl.quit();
    
    if (cb) {
      return cb ();
    }
  }
  
  
  //////////////////////////////////////////////////////////////////
  static list (cb) {
  //////////////////////////////////////////////////////////////////
    _s_rediscl.keys ('jobq:q:ordered_queue:index:?*', function (err, collections) {
      if (err) {
        return cb (err);
      }
      
      var colls = [];
      
      collections.forEach (function (coll) {
        colls.push (coll.substring (27))
      });
      
      cb (null, colls);
    });
  }
};


module.exports = RedisOQ;





