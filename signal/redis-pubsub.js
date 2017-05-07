'use strict';

var RedisConn =  require ('../utils/RedisConn');
var Signal =     require ('../Signal');

class RPSSignal extends Signal {
  constructor (queue, factory, opts) {
    super (queue, opts);
    this._factory = factory;
    
    this._channel = 'keuss:q:signal:' + queue.type () + ':' + queue.name ();
    this._opts = opts || {};

    this._rediscl_pub = this._factory._rediscl_pub;
    this._rediscl_sub = this._factory._rediscl_sub;
    
    this._rediscl_sub.subscribe (this._channel);

    var self = this;
    this._rediscl_sub.on ('message', function (channel, message) {
      var mature = parseInt (message);
      self._verbose ('got redis pubsub event on ch [%s], mature is %d (%s),calling master.emitInsertion(%d)', channel, mature, message, mature);
      self._master.signalInsertion (new Date (mature));
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
