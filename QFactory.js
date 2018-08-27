'use strict';

var async = require ('async');

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
  }

  async_init (cb) {
    var signal_provider = this._opts.signaller.provider || LocalSignal;
    var stats_provider = this._opts.stats.provider || MemStats;

    async.parallel ([
      (cb) => signal_provider (this._opts.signaller.opts, cb),
      (cb) => stats_provider (this._opts.stats.opts, cb)
    ],
    (err, res) => {
      if (err) return cb (err);
      this._signaller_factory = res[0];
      this._stats_factory = res[1];
      cb();
    });
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
    this._stats_factory.close ();
    this._signaller_factory.close (); 
    cb ();
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
