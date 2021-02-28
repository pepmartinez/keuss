var async = require ('async');
var _ =     require ('lodash');

var RedisConn =  require ('../utils/RedisConn');
var Queue =      require ('../Queue');
var QFactory =   require ('../QFactory');


class RedisListQueue extends Queue {

  //////////////////////////////////////////////
  constructor (name, factory, opts, orig_opts) {
    super (name, factory, opts, orig_opts);

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
    var pl = {
      payload: entry.payload,
      tries:   entry.tries
    };

    if (Buffer.isBuffer (pl.payload)) {
      pl.payload = pl.payload.toString ('base64');
      pl.type = 'buffer';
    }

    this._rediscl.lpush (this._redis_l_name, JSON.stringify (pl), (err, res) => {
      if (err) return callback (err);
      callback (null, res);
    });
  }


  /////////////////////////////////////////
  // get element from queue
  get (callback) {
    this._rediscl.rpop (this._redis_l_name, (err, res) => {
      if (err)  return callback (err);
      if (!res) return callback (null, null);

      var pl = JSON.parse (res);

      if (pl.type == 'buffer') {
        try {
          pl.payload = Buffer.from (pl.payload, 'base64');
        } catch (e) {
        }
      }

      pl.mature = new Date (0);
      callback (null, pl);
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
    callback (null, null);
  }
};

class Factory extends QFactory {
  constructor (opts, rediscl) {
    super (opts);
    this._rediscl = rediscl;
  }

  queue (name, opts) {
    var full_opts = {};
    _.merge(full_opts, this._opts, opts);
    return new RedisListQueue (name, this, full_opts, opts);
  }

  close (cb) {
    super.close (() => {
      if (this._rediscl) this._rediscl.quit();
      if (cb) return cb ();
    });
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
  var F = new Factory (_opts, rediscl);
  F.async_init ((err) => cb (null, F));
}

module.exports = creator;





