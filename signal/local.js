'use strict';

var Signal = require ('../Signal');

class LocalSignal extends Signal {
  constructor (queue, factory, opts) {
    super (queue, opts);
    this._factory = factory;
    this._verbose ('created local signaller on queue [%s]', queue.name());
  }
  
  type () {return LocalSignalFactory.Type ()}
  
  emitInsertion (mature, cb) {
    this._verbose ('calling master.emitInsertion(%d)', mature);
    this._master.signalInsertion (mature, cb);
  }
}


class LocalSignalFactory {
  constructor (opts) {
  }

  static Type () {return 'signal:local'}
  type () {return LocalSignalFactory.Type ()}

  signal (queue, opts) {
    return new LocalSignal (queue, this, opts);
  }
}

module.exports = LocalSignalFactory;
