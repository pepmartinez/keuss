'use strict';

var _ =     require ('lodash');

var RedisConn =  require ('../utils/RedisConn');
var WithLog =    require ('../WithLog');

var _s_rediscl = undefined;
var _s_opts = undefined;

/*
 * 
 * redis using HINCRBY
 * 
 */
class RedisStats extends WithLog {
  constructor (name, opts) {
    super (opts);
    this._name = 'jobq:stats:' + name;
    this._opts = opts || {};
    
    if (!_s_rediscl) {
      RedisStats.init (opts);
    }
    
    this._rediscl = _s_rediscl;
    this._cache = {};
    
    this._verbose ('created redis stats on key [%s]', this._name);
  }
  
  static type () {return 'redis'}
  
  static init (opts) {
    _s_opts = opts || {};
    _s_rediscl = RedisConn.conn (_s_opts);
  }
  
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
          self._verbose ('stats-redis: flushed (%s) %d -> %s', self._name, value, key);
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


module.exports = RedisStats;
