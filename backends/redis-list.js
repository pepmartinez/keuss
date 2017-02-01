'use strict';

var async = require ('async');
var _ =     require ('lodash');

var RedisConn =  require ('../utils/RedisConn');
var AsyncQueue = require ('../AsyncQueue');


//////////////////////////////////////////////////////////////////
// static data
var _s_rediscl = null;
var _s_opts = null;


class RedisListQueue extends AsyncQueue {
  
  //////////////////////////////////////////////
  constructor (name, opts) {
  //////////////////////////////////////////////
    if (!_s_rediscl) {
      throw new Error ('Redis not initialized, call init()');
    }
    
    super (name, opts);
    
    this._redis_l_name = 'keuss:q:list:' + this._name;
  }
  
  
  /////////////////////////////////////////
  static Type () {
  /////////////////////////////////////////
    return 'redis:list';
  }

  
  /////////////////////////////////////////
  type () {
  /////////////////////////////////////////
    return 'redis:list';
  }
  
  
  /////////////////////////////////////////
  // add element to queue
  insert (entry, callback) {
  /////////////////////////////////////////
    var self = this;
    var pl = {
      payload: entry.payload,
      tries:   entry.tries
    };
    
    _s_rediscl.lpush (this._redis_l_name, JSON.stringify (pl), function (err, res) {
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
    _s_rediscl.rpop (this._redis_l_name, function (err, res) {
      if (err) {
        return callback (err);
      }
      
      self._verbose  ('get: obtained %j', res, {});
      
      if (!res) {
        callback (null, null);
      }
      else {
        var pl = JSON.parse (res);
        pl.mature = new Date (0);
      
        callback (null, pl);
      }
    });
  }
  
  
  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback) {
  //////////////////////////////////
    _s_rediscl.llen (this._redis_l_name,  callback);
  }
  
  
  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
  //////////////////////////////////
    _s_rediscl.llen (this._redis_l_name,  callback);
  }
  
  
  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
  //////////////////////////////////
    callback (null, 0);
  }
  
  
  //////////////////////////////////
  // Date of next 
  next_t (callback) {
  //////////////////////////////////
    callback (null, null)
  }
    
    
  ////////////////////////////////////////////////////////////////////////////////
  // statics
  
  //////////////////////////////////////////////////////////////////
  static init (opts, cb) {
  //////////////////////////////////////////////////////////////////
    _s_opts = opts;
    if (!_s_opts) _s_opts = {};
    _s_rediscl = RedisConn.conn (_s_opts);
    cb ();
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
    _s_rediscl.keys ('keuss:q:list:?*', function (err, collections) {
      if (err) {
        return cb (err);
      }
      
      var colls = [];
      
      collections.forEach (function (coll) {
        colls.push (coll.substring (13));
      });
      
      cb (null, colls);
    });
  }
};


module.exports = RedisListQueue;





