'use strict';

var RedisConn =  require ('../utils/RedisConn');
var Signal =     require ('../Signal');


class RPSSignal extends Signal {
  constructor (master, opts) {
    super (master, opts);
    
    this._channel = 'keuss:q:signal:' + master.type () + ':' + master.name ();
    this._opts = opts || {};

    this._rediscl_pub = RedisConn.conn (this._opts);
    this._rediscl_sub = RedisConn.conn (this._opts);
    
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
