var async = require ('async');
var _ =     require ('lodash');

var LocalSignal = require ('./signal/local');
var MemStats =    require ('./stats/mem');

var debug = require('debug')('keuss:QFactory');


class QFactory {
  constructor (opts) {
    this._opts = opts || {};
    this._name = opts.name || 'N';

    debug ('created QFactory %s with opts %o', this._name, this._opts);
  }

  async_init (cb) {
    if (!this._opts.stats)      this._opts.stats = {};
    if (!this._opts.stats.opts) this._opts.stats.opts = {};

    if (!this._opts.signaller)      this._opts.signaller = {};
    if (!this._opts.signaller.opts) this._opts.signaller.opts = {};

    var signal_provider = this._opts.signaller.provider || LocalSignal;
    var stats_provider = this._opts.stats.provider || MemStats;

    async.parallel ([
      cb => signal_provider (this._opts.signaller.opts, cb),
      cb => stats_provider (this._opts.stats.opts, cb)
    ], (err, res) => {
      debug ('%s: async init completed, err is %o', this._name, err);

      if (err) return cb (err);
      this._signaller_factory = res[0];
      this._stats_factory = res[1];

      if (this._opts.deadletter) {
        this._max_ko = this._opts.deadletter.max_ko || 0;
        const qname = this._opts.deadletter.queue || '__deadletter__';
        debug('%s: uses deadletter queue %s, max KO is %d', this._name, qname, this._max_ko);
        this.queue (qname, (err, dlq) => {
          this._deadletter_queue = dlq;
          cb (err);
        });
      }
      else {
        cb();
      }
    });
  }

  signaller_factory () {
    return this._signaller_factory;
  }

  stats_factory () {
    return this._stats_factory;
  }

  queue (name, opts, cb) {
    return cb ();
  }

  close (cb) {
    debug ('%s: closing', this._name);
    async.parallel ([
      cb => this._stats_factory.close (cb),
      cb => this._signaller_factory.close (cb)
    ], cb);
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

  deadletter_queue () {
    return this._deadletter_queue;
  }

  max_ko () {
    return this._max_ko;
  }

  list (opts, cb) {
    // use stats factory
    this._stats_factory.queues (this.name (), opts, cb);
  }

  recreate_topology (cb) {
    debug ('%s: recreating topology', this._name);

    this.list ({full: true}, (err, ql) => {
      if (err) return cb (err);

      var ret = {};

      _.each (ql, (v, k) => {
        debug ('%s: recreating topology: adding queue %s with opts %o', this._name, k, v.opts);
        ret[k] = this.queue (k, v.opts);
      });

      cb (null, ret);
    });
  }

  to_descriptor_obj () {
    let obj = {
      name: this.name (),
      type: this.type (),
      opts: _.omit (this._opts, ['stats', 'signaller']),
      signaller: {
        type: this.signaller_factory().type(),
        opts: this._opts.signaller.opts
      },
      stats: {
        type: this.stats_factory().type(),
        opts: this._opts.stats.opts
      }
    };

    return obj;
  }

}

module.exports = QFactory;
