'use strict';

var _ =     require('lodash');
var async = require('async');

var RedisConn = require('../utils/RedisConn');

/*
 * redis using HINCRBY 
 * 
 * stores in:
 *   - counters                   in keuss:stats:<ns>:<name>:counter_<counter> -> int
 *   - opts (queue creation opts) in keuss:stats:<ns>:<name>:opts              -> string/json
 *   - topology                   in keuss:stats:<ns>:<name>:topology          -> string/json
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

    this._rediscl.hset (this._id, 'name',   this._name);
    this._rediscl.hset (this._id, 'ns', this._ns);

//    console.log ('created redis stats with ns %s, name %s, options %j', ns, name, opts);
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
    this._rediscl.hgetall (this._id, function (err, v) {
      if (err) {
        return cb(err);
      }

      // convert values to numeric
      var ret = {};
      for (let k in v) {
        // filter counters
        if (k.startsWith ('counter_')) ret[k.substr (8)] = parseInt(v[k]);
      }

      cb (null, ret);
    });
  }


  _ensureFlush() {
    if (this._flusher) return;
    var self = this;

    this._flusher = setTimeout(function () {
      _.forEach(self._cache, function (value, key) {
        if (value) {
          self._rediscl.hincrby(self._id, 'counter_' + key, value);
//          console.log ('stats-redis[%s]: flushed %d -> %s', self._id, value, 'counter_' + key);
          self._cache[key] = 0;
        }
      });

      self._flusher = undefined;
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
      this._rediscl.hget (this._id, 'opts', function (err, res){
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
  
  topology (tplg, cb) {
    if (!cb) {
      // get
      cb = tplg;
      this._rediscl.hget (this._id, 'topology', function (err, res){
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
      this._rediscl.hset (this._id, 'topology', JSON.stringify (tplg), cb);
    }
  }
  
  clear(cb) {
    this._cancelFlush();
    this._cache = {};
    var self = this;
    
    var tasks = [
      function (cb) {self._rediscl.hdel(self._id, 'opts', cb);},
      function (cb) {self._rediscl.hdel(self._id, 'topology', cb);}
    ];

    this.values ((err, vals) => {
      _.forEach (vals, (v, k) => {
        tasks.push (function (cb) {
          self._rediscl.hdel(self._id, 'counter_' + k, cb);
        });
      });

      async.series (tasks, function (err) {
        if (cb) cb(err);
      });
    });
  }
}

class RedisStatsFactory {
  constructor(opts) {
    this._opts = opts || {};
    this._rediscl = RedisConn.conn(this._opts);

//    console.log ('created redis stats factory with option %j', opts);
  }

  static Type() { return 'redis' }
  type() { return Type() }

  stats(ns, name, opts) {
//    console.log ('creating redis stats with ns %s, name %s, opts %j', ns, name, opts);
    return new RedisStats (ns, name, this, opts);
  }
  
  queues (ns, opts, cb) {
    if (!cb) {
      cb = opts;
      opts = {};
    }

    var self = this;

    this._rediscl.keys('keuss:stats:' + ns + ':?*', function (err, queues) {
      if (err) return cb(err);

      if (opts.full) {
        var tasks = {};
        queues.forEach(function (q) {
          tasks[q.substring(13 + ns.length)] = function (cb) {
            self._rediscl.hgetall (q, function (err, v) {
              if (err) {
                return cb(err);
              }
        
              var ret = {counters: {}};
              for (let k in v) {
                if (k.startsWith ('counter_')) {
                  ret.counters[k.substr (8)] = parseInt(v[k]);
                }
                else if (k == 'topology') {
                  ret[k] = JSON.parse (v[k]);
                }
                else if (k == 'opts') {
                  ret[k] = JSON.parse (v[k]);
                }
                else {
                  ret[k] = v[k];
                }
              }
        
              cb (null, ret);
            });
          };
        });
          
        async.parallel (tasks, cb);
      }
      else {
        var ret = [];
        queues.forEach(function (q) {
          var qname = q.substring(13 + ns.length);
          ret.push(qname);
        });

        cb(null, ret);
      }
    });
  }

  close() {
    this._rediscl.quit();
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
