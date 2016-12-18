'use strict';

var redis = require ('redis');
var _ =     require ('lodash');

var WithLog = require ('../WithLog');

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
    
    // local cache
    this._cache = {};
    
    var self = this;
    this._flusher = setInterval (function () {
      _.forEach (self._cache, function (value, key) {
        if (value) {
          self._rediscl.hincrby (self._name, key, value);
          self._verbose ('stats-redis: flushed (%s) %d -> %s', self._name, value, key);
          self._cache[key] = 0;
        }
      });
    }, this._opts.flush_period || 100);
    
    this._verbose ('created redis stats on key [%s]', this._name);
  }
  
  static type () {return 'redis'}
  
  static init (opts) {
    _s_opts = opts || {};
    
    _s_opts.retry_strategy = function (options) {
      console.log ('redis-stats: redis reconnect!', options)

      if (options.total_retry_time > 1000 * 60 * 60) {
        // End reconnecting after a specific timeout and flush all commands with a individual error 
        return new Error('Retry time exhausted');
      }
      
      // reconnect after 
      return Math.max(options.attempt * 100, 3000);
    }
    
    _s_rediscl = redis.createClient (this._opts);
    
    _s_rediscl.on ('ready',        function ()    {console.log ('RedisStats: rediscl ready')});
    _s_rediscl.on ('conenct',      function ()    {console.log ('RedisStats: rediscl connect')});
    _s_rediscl.on ('reconnecting', function ()    {console.log ('RedisStats: rediscl reconnecting')});
    _s_rediscl.on ('error',        function (err) {console.log ('RedisStats: rediscl error: ' + err)});
    _s_rediscl.on ('end',          function ()    {console.log ('RedisStats: rediscl end')});
    
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
  
  incr (v, delta, cb) {
    if ((delta == null) || (delta == undefined)) delta = 1;
    
    if (!this._cache[v]) {
      this._cache[v] = 0;
    }
    
    this._cache[v] += delta;

    if (cb) cb ();
  }
  
  decr (v, delta, cb) {
    if ((delta == null) || (delta == undefined)) delta = 1;
    this.incr (v, -delta, cb);
  }
  
  clear (cb) {
    this._cache = {};
    var self = this;
    this._rediscl.del (this._name, function (err, res) {
      if (cb) cb (err);
    });
    
  } 
  
  
  // TODO stop timer on destroy
}


module.exports = RedisStats;
