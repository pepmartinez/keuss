'use strict';

var redis = require ('redis');

var Signal = require ('../Signal');


class RPSSignal extends Signal {
  constructor (master, opts) {
    super (master, opts);
    
    this._channel = 'jobq:q:signal:' + master.type () + ':' + master.name ();
    this._opts = opts || {};
    
    var self = this;
    this._opts.retry_strategy = function (options) {
      self._verbose ('redis-pubsub: redis reconnect!', options);

      if (options.total_retry_time > 1000 * 60 * 60) {
        // End reconnecting after a specific timeout and flush all commands with a individual error 
        return new Error ('Retry time exhausted');
      }

      // reconnect after 
      return Math.max (options.attempt * 100, 3000);
    }
    
    this._rediscl_pub = redis.createClient (this._opts);
    
    this._rediscl_pub.on ('ready',        function ()    {self._verbose ('Redis-pubsub: rediscl ready')});
    this._rediscl_pub.on ('conenct',      function ()    {self._verbose ('Redis-pubsub: rediscl connect')});
    this._rediscl_pub.on ('reconnecting', function ()    {self._verbose ('Redis-pubsub: rediscl reconnecting')});
    this._rediscl_pub.on ('error',        function (err) {self._verbose ('Redis-pubsub: rediscl error: ' + err)});
    this._rediscl_pub.on ('end',          function ()    {self._verbose ('Redis-pubsub: rediscl end')});
    
    this._rediscl_sub = redis.createClient (this._opts);
    
    this._rediscl_sub.on ('ready',        function ()    {self._verbose ('Redis-pubsub: rediscl ready')});
    this._rediscl_sub.on ('conenct',      function ()    {self._verbose ('Redis-pubsub: rediscl connect')});
    this._rediscl_sub.on ('reconnecting', function ()    {self._verbose ('Redis-pubsub: rediscl reconnecting')});
    this._rediscl_sub.on ('error',        function (err) {self._verbose ('Redis-pubsub: rediscl error: ' + err)});
    this._rediscl_sub.on ('end',          function ()    {self._verbose ('Redis-pubsub: rediscl end')});
    
    this._rediscl_sub.subscribe (this._channel);
    
    var self = this;
    this._rediscl_sub.on ("message", function (channel, message) {
      var mature = parseInt (message);
      self._verbose ('got redis pubsub event on ch [%s], mature is %d (%s)', channel, mature, message);
      self._verbose ('calling master.emitInsertion(%d)', mature);
      self._master.signalInsertion (new Date (mature));
    });
    
    this._verbose ('created redis-pubsub signaller on channel [%s]', this._channel);
  }
  
  type () {
    return 'signal:redis-pubsub';
  }
  
  emitInsertion (mature, cb) { 
    this._verbose ('emit redis pubsub on channel [%s] mature %d)', this._channel, mature);
    this._rediscl_pub.publish (this._channel, mature.getTime());
  }
}


module.exports = RPSSignal;
