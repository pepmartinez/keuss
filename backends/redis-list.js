'use strict';

var async = require ('async');
var _ =     require ('lodash');

var RedisConn =  require ('../utils/RedisConn');
var Queue = require ('../Queue');
var QFactory =   require ('../QFactory');


class RedisListQueue extends Queue {
  
  //////////////////////////////////////////////
  constructor (name, factory, opts) {
    super (name, factory, opts);

    this._rediscl = factory._rediscl;
    this._redis_l_name = 'keuss:q:list:' + this._name;
  }
  
  
  /////////////////////////////////////////
  static Type () {
    return 'redis:list';
  }

  
  /////////////////////////////////////////
  type () {
    return 'redis:list';
  }
  
  
  /////////////////////////////////////////
  // add element to queue
  insert (entry, callback) {
    var self = this;
    var pl = {
      payload: entry.payload,
      tries:   entry.tries
    };
    
    this._rediscl.lpush (this._redis_l_name, JSON.stringify (pl), function (err, res) {
      if (err) {
        return callback (err);
      }
      
      callback (null, res);
    });
  }
  
  
  /////////////////////////////////////////
  // get element from queue
  get (callback) {
    var self = this;
    this._rediscl.rpop (this._redis_l_name, function (err, res) {
      if (err) {
        return callback (err);
      }
      
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
    this._rediscl.llen (this._redis_l_name,  callback);
  }
  
  
  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
    this._rediscl.llen (this._redis_l_name,  callback);
  }
  
  
  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
    callback (null, 0);
  }
  
  
  //////////////////////////////////
  // Date of next 
  next_t (callback) {
    callback (null, null)
  }
};

class Factory extends QFactory {
  constructor (opts, rediscl) {
    super (opts);
    this._rediscl = rediscl;
  }

  queue (name, opts) {
    var full_opts = {}
    _.merge(full_opts, this._opts, opts);
    return new RedisListQueue (name, this, full_opts);
  }

  close (cb) {
    if (this._rediscl) this._rediscl.quit();
    
    if (cb) {
      return cb ();
    }
  }
  
  type () {
    return RedisListQueue.Type ();
  }

  capabilities () {
    return {
      sched:    false,
      reserve:  false,
      pipeline: false
    };
  }
}


function creator (opts, cb) {
  var _opts = opts || {};
  var rediscl = RedisConn.conn (_opts.redis);
    
  return cb (null, new Factory (_opts, rediscl));
}

module.exports = creator;





