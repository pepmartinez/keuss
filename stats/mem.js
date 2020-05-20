var _ = require ('lodash');

var debug = require('debug')('keuss:Stats:Mem');

class MemStats {
  constructor (ns, name, factory) {
    this._factory = factory;
    this._s = {
      ns: ns,
      name: name,
      counters: {},
      opts: {},
      paused: false
    };
  }

  type () {
    return this._factory.type ();
  }

  ns () {
    return this._s.ns;
  }

  name () {
    return this._s.name;
  }

  values (cb) {
    cb (null, this._s.counters);
  }

  paused (val, cb) {
    if (!cb) {
      // get, val is cb
      cb = val;
      val = undefined;
      cb (null, this._s.paused);
    }
    else {
      // set
      this._s.paused = val;
      cb ();
    }
  }

  incr (v, delta, cb) {
    if (!this._s.counters[v]) {
      this._s.counters[v] = 0;
    }

    if ((delta == null) || (delta == undefined)) delta = 1;
    this._s.counters[v] = this._s.counters[v] + delta;
    if (cb) cb(null, this._s.counters[v]);
  }

  decr (v, delta, cb) {
    if ((delta == null) || (delta == undefined)) delta = 1;
    this.incr (v, -delta, cb);
  }

  opts (opts, cb) {
    if (!cb) {
      // get
      cb = opts;
      cb (null, this._s.opts);
    }
    else {
      // set
      this._s.opts = opts;
      cb ();
    }
  }

  clear (cb) {
    this._s.counters = {}
    this._s.opts = {};
    this._s.paused = false;

    // TODO remove from factory

    if (cb) cb();
  }

  close (cb) {
    cb ();
  }
}

class MemStatsFactory {
  constructor (opts) {
    // map of created queues' stats: root -> ns -> queues
    this._queues = {};
  }

  static Type () {
    return 'mem';
  }

  type () {
    return MemStatsFactory.Type ();
  }

  queues (ns, opts, cb) {
    if (!cb) {
      cb = opts;
      opts = {};
    }

    var cls = this._queues[ns];

    if (opts.full) {
      if (!cls) return cb (null, {});

      var ret = {};

      _.forEach (cls, function (v, k) {
        ret[k] = v._s;
      });

      cb (null, ret);
    }
    else {
      if (!cls) return cb (null, []);

      var ret = [];

      _.forEach (cls, function (v, k) {
        ret.push (k);
      });

      cb (null, ret);
    }
  }

  stats (ns, name, opts) {
    if (!this._queues[ns]) this._queues[ns] = {};
    var st = new MemStats (ns, name, this);
    this._queues[ns][name] = st;
    return st;
  }

  close (cb) {
    if (cb) cb ();
  }
}

function creator (opts, cb) {
  if (!cb) {
    cb = opts;
    opts = null;
  }

  return cb (null, new MemStatsFactory (opts));
}

module.exports = creator;
