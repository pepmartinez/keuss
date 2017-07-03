'use strict';

var mitt = require ('mitt');

var RedisConn =  require ('../utils/RedisConn');
var Signal =     require ('../Signal');

class RPSSignal extends Signal {
  constructor (queue, factory, opts) {
    super (queue, opts);
    this._factory = factory;
    
    this._channel = 'keuss:q:signal:' + queue.type () + ':' + queue.name ();
    this._opts = opts || {};
    var self = this;
    
    this._factory._emitter.on (this._channel, function (message) {
      var mature = parseInt (message);
      self._verbose ('got redis pubsub event on ch [%s], message is %s, calling master.emitInsertion(%d)', self._channel, message, mature);
      self._master.signalInsertion (new Date (mature));
    });

    this._rediscl_pub = this._factory._rediscl_pub;
    this._rediscl_sub = this._factory._rediscl_sub;
    
    this._rediscl_sub.subscribe (this._channel);

    this._rediscl_sub.on ('message', function (channel, message) {
      self._verbose ('got redis pubsub event on ch [%s], message is %s,calling master.emitInsertion(%d)', channel, message, mature);

      // convey to local through mitt
      self._factory._emitter.emit (channel, message);
    });
    
    this._verbose ('created redis-pubsub signaller on channel [%s]', this._channel);
  }
    
  type () {return RPSSignalFactory.Type ()}
  
  emitInsertion (mature, cb) { 
    this._verbose ('emit redis pubsub on channel [%s] mature %d)', this._channel, mature);
    this._rediscl_pub.publish (this._channel, mature.getTime());
  }
}

class RPSSignalFactory {
  constructor (opts) {
    this._opts = opts || {};
    this._emitter = mitt();
    this._rediscl_pub = RedisConn.conn (this._opts);
    this._rediscl_sub = RedisConn.conn (this._opts);
  }

  static Type () {return 'signal:redis-pubsub'}
  type () {return Type ()}

  signal (channel, opts) {
    return new RPSSignal (channel, this, opts);
  }
}

module.exports = RPSSignalFactory;
