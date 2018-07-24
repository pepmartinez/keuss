'use strict';

var _ = require ('lodash');

class MemStats {
  constructor (ns, name, factory) {
    this._factory = factory;
    this._s = {
      ns: ns,
      name: name,
      counters: {},
      opts: {},
      topology: {}
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
  
  topology (tplg, cb) {
    if (!cb) {
      // get
      cb = tplg;
      cb (null, this._s.topology);
    }
    else {
      // set
      this._s.topology = tplg;
      cb ();
    }
  }

  clear (cb) {
    this._s.counters = {}
    this._s.opts = {};
    this._s.topology = {};
    
    // TODO remove from factory 
    
    if (cb) cb();
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
    return Type ();
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

  close () {
  }
}

module.exports = MemStatsFactory;
