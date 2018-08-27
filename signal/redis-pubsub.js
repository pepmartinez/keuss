'use strict';

var mitt = require ('mitt');

var RedisConn = require ('../utils/RedisConn');
var Signal =    require ('../Signal');

class RPSSignal extends Signal {
  constructor (queue, factory, opts) {
    super (queue, opts);
    this._factory = factory;
    
    this._channel = 'keuss:signal:' + queue.ns () + ':' + queue.name ();
    this._opts = opts || {};
    var self = this;
    
    this._factory._emitter.on (this._channel, function (message) {
      var mature = parseInt (message);
      
//      console.log ('got pubsub event on ch [%s], message is %s, calling master.emitInsertion(%d)', self._channel, message, mature);
      self._master.signalInsertion (new Date (mature));
    });

    this._rediscl_pub = this._factory._rediscl_pub;
    this._rediscl_sub = this._factory._rediscl_sub;
    
    this._rediscl_sub.subscribe (this._channel);
  }
    
  type () {return RPSSignalFactory.Type ()}
  
  emitInsertion (mature, cb) { 
//    console.log ('emit redis pubsub on channel [%s] mature %d)', this._channel, mature);
    this._rediscl_pub.publish (this._channel, mature.getTime());
  }
}

class RPSSignalFactory {
  constructor (opts) {
    this._opts = opts || {};
    this._emitter = mitt ();
    this._rediscl_pub = RedisConn.conn (this._opts);
    this._rediscl_sub = RedisConn.conn (this._opts);

    var self = this;
    this._rediscl_sub.on ('message', function (channel, message) {
      // convey to local through mitt
      self._emitter.emit (channel, message);
    });

//    console.log ('created redis-pubsub factory with opts %j', opts);
  }

  static Type () {return 'signal:redis-pubsub'}
  type () {return Type ()}

  signal (channel, opts) {
//    console.log ('creating redis-pubsub signaller with opts %j', opts);
    return new RPSSignal (channel, this, opts);
  }

  close () {
    this._rediscl.quit();
  }
}


function creator (opts, cb) {    
  return cb (null, new RPSSignalFactory (opts));
}

module.exports = creator;
