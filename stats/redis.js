'use strict';

var _ =     require ('lodash');

var RedisConn =  require ('../utils/RedisConn');

var _s_rediscl = undefined;
var _s_opts = undefined;

/*
 * redis using HINCRBY
*/
class RedisStats {
  constructor (name, factory, opts) {
    this._name = 'keuss:stats:' + name;
    this._opts = opts || {};
    this._factory = factory
    this._rediscl = factory._rediscl;
    this._cache = {};
  }
  
  type () {return this._factory.type ()}
  
  values (cb) {
    this._rediscl.hgetall (this._name, function (err, v) {
      if (err) {
        return cb (err);
      }
      
      // convert values to numeric
      for (let k in v) {
        v[k] = parseInt(v[k]);
      }

      cb (null, v || {});
    });
  }
  

  _ensureFlush () {
    if (this._flusher) return;
    var self = this;

    this._flusher = setTimeout (function () {
      _.forEach (self._cache, function (value, key) {
        if (value) {
          self._rediscl.hincrby (self._name, key, value);
          // ('stats-redis: flushed (%s) %d -> %s', self._name, value, key);
          self._cache[key] = 0;
        }
      });

      self._flusher = undefined;
    }, this._opts.flush_period || 100);
  }

  _cancelFlush () {
    if (this._flusher) {
      clearTimeout (this._flusher);
      this._flusher = undefined;
    }
  }


  incr (v, delta, cb) {
    if ((delta === null) || (delta === undefined)) delta = 1;
    
    if (!this._cache[v]) {
      this._cache[v] = 0;
    }
    
    this._cache[v] += delta;
    this._ensureFlush ();

    if (cb) cb ();
  }
  
  decr (v, delta, cb) {
    if ((delta === null) || (delta === undefined)) delta = 1;
    this.incr (v, -delta, cb);
  }
  
  clear (cb) {
    this._cancelFlush ();
    this._cache = {};
    var self = this;

    this._rediscl.del (this._name, function (err, res) {
      if (cb) cb (err);
    });
  } 
}

class RedisStatsFactory {
  constructor (opts) {
    this._opts = opts || {};
    this._rediscl = RedisConn.conn (this._opts);
  }

  static Type () {return 'redis'}
  type () {return Type ()}

  stats (name) {
    return new RedisStats (name, this);
  }

  close () {
    this._rediscl.quit ();
  }
}

module.exports = RedisStatsFactory;
