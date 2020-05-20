var _ =     require('lodash');
var async = require('async');

var RedisConn = require('../utils/RedisConn');

var debug = require('debug')('keuss:Stats:Redis');

/*
 * redis using HINCRBY
 *
 * stores in:
 *   - counters                   in keuss:stats:<ns>:<name>:counter_<counter> -> int
 *   - opts (queue creation opts) in keuss:stats:<ns>:<name>:opts              -> string/json
*/
class RedisStats {
  constructor(ns, name, factory, opts) {
    this._ns = ns;
    this._name = name;
    this._id = 'keuss:stats:' + ns + ':' + name;
    this._opts = opts || {};
    this._factory = factory;
    this._rediscl = factory._rediscl;
    this._cache = {};

    this._rediscl.hset (this._id, 'name', this._name);
    this._rediscl.hset (this._id, 'ns',   this._ns);

    debug ('created redis stats with ns %s, name %s, options %j', ns, name, opts);
  }


  type() {
    return this._factory.type();
  }

  ns () {
    return this._ns;
  }

  name () {
    return this._name;
  }

  values(cb) {
    this._rediscl.hgetall (this._id, (err, v) => {
      if (err) return cb(err);

      // convert values to numeric
      var ret = {};
      for (let k in v) {
        // filter counters
        if (k.startsWith ('counter_')) ret[k.substr (8)] = parseInt(v[k]);
      }

      cb (null, ret);
    });
  }

  paused (val, cb) {
    if (!cb) {
      // get, val is cb
      cb = val;
      val = undefined;

      this._rediscl.hget (this._id, 'paused', (err, res) => {
        if (err) return cb(err);
        if (!res) return cb(null, false);
        return cb (null, (res == 'true' ? true : false));
      });
    }
    else {
      // set
      this._rediscl.hset (this._id, 'paused', val ? 'true' : 'false', err => cb (err));
    }
  }

  _flush (cb) {
    _.forEach (this._cache, (value, key) => {
      if (value) {
        this._rediscl.hincrby (this._id, 'counter_' + key, value);
        debug ('stats-redis[%s]: flushed %d -> %s', this._id, value, 'counter_' + key);
        this._cache[key] = 0;
      }
    });

    if (cb ) setImmediate (() => cb ());
  }


  _ensureFlush() {
    if (this._flusher) return;

    this._flusher = setTimeout(() => {
      this._flusher = undefined;
      this._flush ();
    }, this._opts.flush_period || 100);
  }


  _cancelFlush() {
    if (this._flusher) {
      clearTimeout(this._flusher);
      this._flusher = undefined;
    }
  }


  incr(v, delta, cb) {
    if ((delta === null) || (delta === undefined)) delta = 1;

    if (!this._cache[v]) {
      this._cache[v] = 0;
    }

    this._cache[v] += delta;
    this._ensureFlush();

    if (cb) cb();
  }


  decr(v, delta, cb) {
    if ((delta === null) || (delta === undefined)) delta = 1;
    this.incr(v, -delta, cb);
  }


  opts (opts, cb) {
    if (!cb) {
      // get
      cb = opts;
      this._rediscl.hget (this._id, 'opts', (err, res) => {
        if (err) return cb(err);
        if (!res) return cb(null, {});
        try {
          if (res) res = JSON.parse(res);
          cb (null, res);
        }
        catch (e) {
          cb(e);
        }
      });
    }
    else {
      // set
      this._rediscl.hset (this._id, 'opts', JSON.stringify (opts || {}), cb);
    }
  }


  clear(cb) {
    this._cancelFlush();
    this._cache = {};

    var tasks = [
      cb => this._rediscl.hdel (this._id, 'opts', cb)
    ];

    this.values ((err, vals) => {
      _.forEach (vals, (v, k) => {
        tasks.push (cb => this._rediscl.hdel (this._id, 'counter_' + k, cb));
      });

      async.series (tasks, err => {
        if (cb) cb(err);
      });
    });
  }


  close (cb) {
    this._cancelFlush();
    this._flush (cb);
  }
}

class RedisStatsFactory {
  constructor(opts) {
    this._opts = opts || {};
    this._rediscl = RedisConn.conn(this._opts);

    this._instances = {};
    debug ('created redis stats factory with option %j', opts);
  }

  static Type() { return 'redis' }
  type() { return RedisStatsFactory.Type() }


  stats(ns, name, opts) {
    var k = name + '@' + ns;
    if (!this._instances [k]) {
      this._instances [k] = new RedisStats (ns, name, this, opts);
      debug ('created redis stats with ns %s, name %s, opts %j', ns, name, opts);
    }

    return this._instances [k];
  }


  queues (ns, opts, cb) {
    if (!cb) {
      cb = opts;
      opts = {};
    }

    this._rediscl.keys('keuss:stats:' + ns + ':?*', (err, queues) => {
      if (err) return cb(err);

      if (opts.full) {
        var tasks = {};
        queues.forEach(q => {
          tasks[q.substring(13 + ns.length)] = cb => {
            this._rediscl.hgetall (q, (err, v) => {
              if (err) return cb(err);

              var ret = {counters: {}};
              for (let k in v) {
                if (k.startsWith ('counter_')) {
                  ret.counters[k.substr (8)] = parseInt(v[k]);
                }
                else if (k == 'opts') {
                  ret[k] = JSON.parse (v[k]);
                }
                else if (k == 'paused') {
                  ret[k] = (v[k] == 'true' ? true : false);
                }
                else {
                  ret[k] = v[k];
                }
              }

              if (ret.paused === undefined) ret.paused = false;

              cb (null, ret);
            });
          };
        });

        async.parallel (tasks, cb);
      }
      else {
        var ret = [];
        queues.forEach(q => {
          var qname = q.substring(13 + ns.length);
          ret.push(qname);
        });

        cb(null, ret);
      }
    });
  }


  close (cb) {
    var tasks = [];

    // flush pending stats
    _.each (this._instances, (v, k) => {
      tasks.push ((cb) => {
        debug (`closing RedisStats ${k}`);
        v.close (cb);
      });
    });

    async.series ([
      (cb) => async.parallel (tasks, cb),
      (cb) => {
        debug (`closing RedisStatsFactory redis conn`);
        this._rediscl.quit(cb);
      }
    ], cb);
  }
}

function creator (opts, cb) {
  if (!cb) {
    cb = opts;
    opts = null;
  }

  if (!opts) opts = {};

  return cb (null, new RedisStatsFactory (opts));
}

module.exports = creator;
