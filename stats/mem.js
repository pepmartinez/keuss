var _ = require ('lodash');

var Stats = require ('../Stats');

var debug = require('debug')('keuss:Stats:Mem');

class MemStats extends Stats {
  constructor (ns, name, factory) {
    super (ns, name, factory);

    this._s = {
      ns: ns,
      name: name,
      counters: {},
      opts: {},
      paused: false
    };
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
    if ((delta == null) || (delta == undefined)) delta = 1;
    const old_v = _.get (this._s.counters, v, 0);
    _.set (this._s.counters, v, old_v + delta);
    const new_v = _.get (this._s.counters, v);
    debug ('incr %s by %d: %d --> %d', v, delta, old_v, new_v);
    if (cb) cb(null, new_v);
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
