var _ = require ('lodash')

var Queue =             require ('../Queue');
var RedisConn =         require ('../utils/RedisConn');
var RedisOrderedQueue = require ('../utils/RedisOrderedQueue');
var QFactory =          require ('../QFactory');


class RedisOQ extends Queue {

  //////////////////////////////////////////////
  constructor (name, factory, opts, orig_opts) {
    super (name, factory, opts, orig_opts);

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
    this._roq.push (entry, callback);
  }


  /////////////////////////////////////////
  // get element from queue
  get (callback) {
    this._roq.pop (callback);
  }


  /////////////////////////////////////////
  // reserve element: call cb (err, pl) where pl has an id
  reserve (callback) {
    var delay = this._opts.reserve_delay || 120;
    this._roq.reserve (delay*1000, callback);
  }


  /////////////////////////////////////////
  // commit previous reserve, by p.id: call cb (err, true|false), true if element committed
  commit (id, callback) {
    this._roq.commit (id, (err, res) => {
      if (err) return callback (err);
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

    this._roq.rollback (id, next_t, (err, res) => {
      if (err) return callback (err);
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
    this._roq.peek ((err, res) => {
      if (err) return callback (err);
      if (res.length < 1) return callback (null, null);
      callback (null, new Date (parseInt (res[1])));
    });
  }


  //////////////////////////////////////////////
  // remove by id
  remove (id, callback) {
    this._roq.remove (id, (err, res) => {
      if (err) return callback (err);
      return callback (null, res != null)
    });
  }
};



class Factory extends QFactory {
  constructor (opts, rediscl, roq_factory) {
    super (opts);

    this._rediscl = rediscl;
    this._roq_factory = roq_factory;
  }

  queue (name, opts, cb) {
    if (!cb) {
      cb = opts;
      opts = {};
    }
    
    const full_opts = {};
    _.merge(full_opts, this._opts, opts);
    return setImmediate (() => cb (null, new RedisOQ (name, this, full_opts, opts)));
  }

  close (cb) {
    super.close (() => {
      if (this._rediscl) this._rediscl.quit();
      if (cb) return cb ();
    });
  }

  type () {
    return RedisOQ.Type ();
  }

  capabilities () {
    return {
      sched:    true,
      reserve:  true,
      pipeline: false,
      tape:     false,
      remove:   true
    };
  }
}


function creator (opts, cb) {
  var _opts = opts || {};
  var _rediscl = RedisConn.conn (_opts.redis);
  var _roq_factory = new RedisOrderedQueue (_rediscl);
  var F = new Factory (_opts, _rediscl, _roq_factory);
  F.async_init (err => cb (null, F));
}

module.exports = creator;


