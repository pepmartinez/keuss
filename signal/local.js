'use strict';

var Signal = require ('../Signal');

class LocalSignal extends Signal {
  constructor (master, opts) {
    super (master, opts);
    this._verbose ('created local signaller on queue [%s]', master.name());
  }
  
  type () {
    return 'signal:local';
  }
  
  // to be extended:
  emitInsertion (mature, cb) {
    this._verbose ('calling master.emitInsertion(%d)', mature);
    this._master.signalInsertion (mature, cb);
  }
}


module.exports = LocalSignal;
