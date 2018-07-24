'use strict';

var LocalSignal = require ('./signal/local');
var MemStats =    require ('./stats/mem');

var _ = require ('lodash');


class QFactory {
  constructor (opts) {
    this._opts = opts || {};

    this._name = opts.name || 'N';
    
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
  
  name () {
    return this._name;
  }

  type () {
    return 'none';
  }

  capabilities () {
    return {};
  }
  
  list (opts, cb) {
    // use stats factory
    this._stats_factory.queues (this.name (), opts, cb);
  }

  recreate_topology (cb) {
    var self = this;

    this.list ({full: true}, function (err, ql) {
      if (err) return cb (err);

      var ret = {};

      _.forEach (ql, function (v, k) {
        var q = self.queue (k, v.opts);
        ret[k] = q;
      });

      cb (null, ret);
    });
  } 
}

module.exports = QFactory;
