'use strict';

var async = require ('async');
var _ =     require ('lodash');
var uuid =  require ('uuid');

var AsyncQueue =        require ('../AsyncQueue');
var RedisConn =         require ('../utils/RedisConn');
var RedisOrderedQueue = require ('../utils/RedisOrderedQueue');


class RedisOQ extends AsyncQueue {
  
  //////////////////////////////////////////////
  constructor (name, factory, opts) {
  //////////////////////////////////////////////
    super (name, opts);
    
    this._factory = factory;
    this._rediscl = factory._rediscl;
    this._roq = factory._roq_factory.roq (this._name);
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

        // TODO check res has 2, and parses as json

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

  
  
  //////////////////////////////////////////////////////////////////
  static list (cb) {
  //////////////////////////////////////////////////////////////////
    var colls = [];
    
    _s_rediscl.keys ('keuss:q:ordered_queue:index:?*', function (err, collections) {
      if (err) return cb (err);
      
      collections.forEach (function (coll) {
        colls.push (coll.substring (28))
      });

      // add "keuss:stats:redis:list:*" to try to add empty queues
      _s_rediscl.keys ('keuss:stats:redis:oq:?*', function (err, collections) {
        if (err) return cb (err);

        collections.forEach (function (coll) {
          var qname = coll.substring (21);
          if (_.indexOf (colls, qname) == -1) colls.push (qname);
        });
      
        cb (null, colls);
      });
    });
  }
};



class Factory {
  constructor (opts, rediscl, roq_factory) {
    this._opts = opts || {};
    this._rediscl = rediscl;
    this._roq_factory = roq_factory;
  }

  queue (name, opts) {
    var full_opts = {}
    _.merge(full_opts, this._opts, opts);
    return new RedisOQ (name, this, full_opts);
  }

  close (cb) {
    if (this._rediscl) this._rediscl.quit();
    
    if (cb) {
      return cb ();
    }
  }
  
  type () {
    return RedisOQ.Type ();
  }

  list (cb) {
    var colls = [];
    var self = this;

    this._rediscl.keys ('keuss:q:ordered_queue:index:?*', function (err, collections) {
      if (err) return cb (err);
      
      collections.forEach (function (coll) {
        colls.push (coll.substring (28))
      });

      // add "keuss:stats:redis:list:*" to try to add empty queues
      self._rediscl.keys ('keuss:stats:redis:oq:?*', function (err, collections) {
        if (err) return cb (err);

        collections.forEach (function (coll) {
          var qname = coll.substring (21);
          if (_.indexOf (colls, qname) == -1) colls.push (qname);
        });
      
        cb (null, colls);
      });
    });
  }
}


function creator (opts, cb) {
  var _opts = opts || {};
  var _rediscl = RedisConn.conn (_opts.redis);
  var _roq_factory = new RedisOrderedQueue (_rediscl);
  return cb (null, new Factory (_opts, _rediscl, _roq_factory));
}

module.exports = creator;


