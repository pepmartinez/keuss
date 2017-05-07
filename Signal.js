'use strict';

var WithLog = require ('./utils/WithLog');


class Signal extends WithLog {
  constructor (master, opts) {
    super (opts);
    
    this._opts = opts || {};
    this._master = master;
    this._name = 'signal:' + master._name;
    
    this._bufferTime = this._opts.bufferTime || 50; //msec
    
    this._buffered_mature = null;
    this._lastHRT = null;
    
    this._verbose ('Signaller created with bufferTime %d msecs', this._bufferTime);
  }

  signalInsertion (mature, cb) {
    var emit = false;
    
    if ((!this._buffered_mature) || (mature < this._buffered_mature)) {
      this._buffered_mature = mature;
    }
    
    if (!this._lastHRT) {
      this._lastHRT = process.hrtime ();
      this._verbose ('first hit');
      emit = true;
    }
    else {
      var hrt = process.hrtime (this._lastHRT);
      var hrt_ms = Signal._hrtimeAsMSecs (hrt);
    
      this._verbose ('msec since last hit: %d', hrt_ms);
    
      if (hrt_ms > this._bufferTime) {
        this._verbose ('last hit too away in the past, emitting');
        emit = true;
      }
    }
    
    if (emit) {
      this._verbose ('emitting buffered hit with mature: %d', this._buffered_mature);
      this.emitInsertion (this._buffered_mature, cb);
      
      this._buffered_mature = 0;
      this._lastHRT = process.hrtime ();
    }
    else {
      this._verbose ('last hit too close in the past, not emitting');
      if (cb) cb ();
    }
  }
  
  
  // to be extended:
  emitInsertion (mature, cb) {
    if (cb) cb ();
  }
  

  static _hrtimeAsMSecs (hrtime) {
    return (hrtime[0] * 1000) + (hrtime[1] / 1e6);
  }
}

module.exports = Signal;
