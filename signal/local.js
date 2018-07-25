'use strict';

var mitt = require ('mitt');

var Signal = require ('../Signal');

class LocalSignal extends Signal {
  constructor (queue, factory, opts) {
    super (queue, opts);
    this._factory = factory;
    this._channel = 'keuss:signal:' + queue.ns () + ':' + queue.name ();

    var self = this;
    this._factory._emitter.on (this._channel, function (message) {
      var mature = message;
      
      // ('got event on ch [%s], message is %s, calling master.emitInsertion(%d)', self._channel, message);
      self._master.signalInsertion (new Date (mature));
    });
  }
  
  type () {return LocalSignalFactory.Type ()}
  
  emitInsertion (mature, cb) {
    // convey to local through mitt
    this._factory._emitter.emit (this._channel, mature.getTime ());
  }
}


class LocalSignalFactory {
  constructor (opts) {
    this._emitter = mitt();
  }

  static Type () {return 'signal:local'}
  type () {return LocalSignalFactory.Type ()}

  signal (queue, opts) {
    return new LocalSignal (queue, this, opts);
  }
}


module.exports = LocalSignalFactory;
