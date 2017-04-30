'use strict';

var async = require ('async');
var _ =     require ('lodash');

var RedisConn =  require ('../utils/RedisConn');
var AsyncQueue = require ('../AsyncQueue');


class RedisListQueue extends AsyncQueue {
  
  //////////////////////////////////////////////
  constructor (name, factory, opts) {
  //////////////////////////////////////////////
    super (name, opts);

    this._factory = factory;
    this._rediscl = factory._rediscl;
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
    
    this._rediscl.lpush (this._redis_l_name, JSON.stringify (pl), function (err, res) {
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
    this._rediscl.rpop (this._redis_l_name, function (err, res) {
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
    this._rediscl.llen (this._redis_l_name,  callback);
  }
  
  
  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
  //////////////////////////////////
    this._rediscl.llen (this._redis_l_name,  callback);
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
};

class Factory {
  constructor (opts, rediscl) {
    this._opts = opts || {};
    this._rediscl = rediscl;
  }

  queue (name, opts) {
    return new RedisListQueue (name, this, opts);
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

  list (cb) {
    var colls = [];
    var self = this;

    this._rediscl.keys ('keuss:q:list:?*', function (err, collections) {
      if (err) return cb (err);

      collections.forEach (function (coll) {
        colls.push (coll.substring (13));
      });

      // add "keuss:stats:redis:list:*" to try to add empty queues
      self._rediscl.keys ('keuss:stats:redis:list:?*', function (err, collections) {
        if (err) return cb (err);

        collections.forEach (function (coll) {
          var qname = coll.substring (23);
          if (_.indexOf (colls, qname) == -1) colls.push (qname);
        });
      
        cb (null, colls);
      });
    });
  }
}


function creator (opts, cb) {
  var _opts = opts || {};
  var _rediscl = RedisConn.conn (_opts);
    
  return cb (null, new Factory (_opts, _rediscl));
}

module.exports = creator;





