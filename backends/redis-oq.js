'use strict';

var async = require ('async');
var _ =     require ('lodash')

var Queue =        require ('../Queue');
var RedisConn =         require ('../utils/RedisConn');
var RedisOrderedQueue = require ('../utils/RedisOrderedQueue');
var QFactory =          require ('../QFactory');


class RedisOQ extends Queue {
  
  //////////////////////////////////////////////
  constructor (name, factory, opts) {
    super (name, factory, opts);
    
    this._rediscl = factory._rediscl;
    this._roq = factory._roq_factory.roq (this._name);
  }
  
  
  /////////////////////////////////////////
  static Type () {
    return 'redis:oq';
  }

  
  /////////////////////////////////////////
  type () {
    return 'redis:oq';
  }
  
  
  /////////////////////////////////////////
  // add element to queue
  insert (entry, callback) {
    var self = this;
    this._roq.push (entry, callback);
  }
  
  
  /////////////////////////////////////////
  // get element from queue
  get (callback) {
    var self = this;
    this._roq.pop (callback);
  }


  /////////////////////////////////////////
  // reserve element: call cb (err, pl) where pl has an id
  reserve (callback) {
    var self = this;
    var delay = this._opts.reserve_delay || 120;

    this._roq.reserve (delay*1000, callback);
  }

    
  /////////////////////////////////////////
  // commit previous reserve, by p.id: call cb (err, true|false), true if element committed
  commit (id, callback) {
    var self = this;

    this._roq.commit (id, function (err, res) {
      if (err) {
        return callback (err);
      }

      return callback (null, res != null)
    });
  }
    

  /////////////////////////////////////////
  // rollback previous reserve, by p.id: call cb (err, true|false), true if element rolled back
  rollback (id, next_t, callback) {
    if (_.isFunction (next_t)) {
      callback = next_t;
      next_t = null;
    }

    var self = this;

    this._roq.rollback (id, next_t, function (err, res) {
      if (err) {
        return callback (err);
      }

      return callback (null, (res ? true : false))
    });
  }

  
  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback) {
    this._roq.totalSize (callback);
  }
  
  
  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
    this._roq.size (callback);
  }
  
  
  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
    this._roq.schedSize (callback);
  }
  
  
  //////////////////////////////////
  // Date of next 
  next_t (callback) {
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



class Factory extends QFactory {
  constructor (opts, rediscl, roq_factory) {
    super (opts);
    
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

  capabilities () {
    return {
      sched:    true,
      reserve:  true,
      pipeline: false
    };
  }
}


function creator (opts, cb) {
  var _opts = opts || {};
  var _rediscl = RedisConn.conn (_opts.redis);
  var _roq_factory = new RedisOrderedQueue (_rediscl);
  return cb (null, new Factory (_opts, _rediscl, _roq_factory));
}

module.exports = creator;


