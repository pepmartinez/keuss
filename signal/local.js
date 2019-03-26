var mitt = require ('mitt');

var Signal = require ('../Signal');

var debug = require('debug')('keuss:Signal:local');


class LocalSignal extends Signal {
  constructor (queue, factory, opts) {
    super (queue, opts);
    this._factory = factory;
    this._channel = 'keuss:signal:' + queue.ns () + ':' + queue.name ();

    var self = this;
    this._factory._emitter.on (this._channel, function (message) {
      var mature = message;
      
      debug ('got event on ch [%s], message is %s, calling master.emitInsertion(%d)', self._channel, message);
      self._master.signalInsertion (new Date (mature));
    });

    debug ('created LocalSignal for channel %s', this._channel);
  }
  
  type () {return LocalSignalFactory.Type ()}
  
  emitInsertion (mature, cb) {
    debug ('got event [%o], relay on local mitt', mature);
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

  close (cb) {
    cb ();
  }
}


function creator (opts, cb) {
  return cb (null, new LocalSignalFactory (opts));
}

module.exports = creator;

