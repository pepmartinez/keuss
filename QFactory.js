'use strict';

var LocalSignal = require ('./signal/local');
var MemStats =    require ('./stats/mem');


class QFactory {
  constructor (opts) {
    this._opts = opts || {};
    
    if (!this._opts.stats)      this._opts.stats = {};
    if (!this._opts.stats.opts) this._opts.stats.opts = {};

    if (!this._opts.signaller)      this._opts.signaller = {};
    if (!this._opts.signaller.opts) this._opts.signaller.opts = {};

    this._signaller_factory = this._opts.signaller.provider || new LocalSignal ();
    this._stats_factory =     this._opts.stats.provider || new MemStats ();
  }

  signaller_factory () {
    return this._signaller_factory;
  }
  
  stats_factory () {
    return this._stats_factory;
  }

  queue (name, opts) {
    return null;
  }

  close (cb) {
    cb();
  }
  
  type () {
    return 'none';
  }

  list (opts, cb) {
    // use stats factory
    this._stats_factory.queues (this.type (), opts, cb);
  }
}

module.exports = QFactory;
