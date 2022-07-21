
var debug = require('debug')('keuss:Signal:base');

class Signal {
  constructor (master, opts) {
    this._opts = opts || {};
    this._master = master;
    this._name = 'signal:' + master.ns() + ':' + master.name();

    this._bufferTime = this._opts.bufferTime || 50; //msec

    this._buffered_mature = null;
    this._lastHRT = null;

    debug ('Signaller created with bufferTime %d msecs', this._bufferTime);
  }

  signalInsertion (mature, cb) {
    var emit = false;
    debug ('signaller got a signalInsertion with %s. _buffered_mature is %s', mature, this._buffered_mature);

    if ((!this._buffered_mature) || (mature < this._buffered_mature)) {
      this._buffered_mature = mature;
    }

    if (!this._lastHRT) {
      // first hit
      this._lastHRT = process.hrtime ();
      emit = true;
    }
    else {
      var hrt = process.hrtime (this._lastHRT);
      var hrt_ms = Signal._hrtimeAsMSecs (hrt);

      debug ('msec since last hit: %d', hrt_ms);

      if (hrt_ms > this._bufferTime) {
        // last hit too away in the past, emitting
        emit = true;
      }
    }

    if (emit) {
      this.emitInsertion (this._buffered_mature, cb);

      debug ('signaller called emitInsertion (%s)', this._buffered_mature);
      this._buffered_mature = 0;
      this._lastHRT = process.hrtime ();
    }
    else {
      // last hit too close in the past, not emitting
      debug ('%s: last hit too close in the past, not emitting (%s)', this._buffered_mature);
      if (cb) cb ();
    }
  }


  signalPaused (paused, cb) {
    debug ('signaller got a signalPaused with %b', paused);
    this.emitPaused (paused, cb);
    debug ('signaller called emitPaused (%s)', paused);
  }


  // to be extended:
  emitInsertion (mature, cb) {
    if (cb) cb ();
  }

  // to be extended:
  emitPaused (paused, cb) {
    if (cb) cb ();
  }


  // to be extended: generic pubsub service
  subscribe_extra (topic, on_cb) {return false}
  unsubscribe_extra (subscr) {}
  emit_extra (topic, ev, cb) {if (cb) cb ();}


  static _hrtimeAsMSecs (hrtime) {
    return (hrtime[0] * 1000) + (hrtime[1] / 1e6);
  }
}

module.exports = Signal;
