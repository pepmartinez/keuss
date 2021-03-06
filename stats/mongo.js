var _ =           require ('lodash');
var async =       require ('async');
var MongoClient = require ('mongodb').MongoClient;

var Stats = require ('../Stats');

var debug = require('debug')('keuss:Stats:Mongo');

/*
 * plain into a single mongo coll
*/
class MongoStats  extends Stats {
  constructor(ns, name, factory, opts) {
    super (ns, name, factory);
    this._id = 'keuss:stats:' + ns + ':' + name;
    this._opts = opts || {};
    this._cache = {};

    var upd = {
      $set: {
        ns:   this._ns,
        name: this._name,
      }
    };

    this._coll().updateOne ({_id: this._id}, upd, {upsert: true}, (err, ret) => {
      debug ('mongo stats created, ns %s, name %s, opts %j', ns, name, opts);
    });
  }

  values(cb) {
    this._coll().findOne ({_id: this._id}, {projection: {counters: 1}}, (err, res) => {
      if (err) return cb (err);

      debug ('mongo stats: get %s -> %j', this._name, res);
      cb (null, (res && res.counters) || {});
    });
  }

  paused (val, cb) {
    if (!cb) {
      // get, val is cb
      cb = val;
      val = undefined;

      this._coll().findOne ({_id: this._id}, {projection: {paused: 1}}, (err, res) => {
        if (err) return cb (err);
        debug ('mongo stats - paused: get %s -> %j', this._name, res);
        cb (null, (res && res.paused) || false);
      });
    }
    else {
      // set
      var upd = {$set: {paused : val}};
      this._coll().updateOne ({_id: this._id}, upd, {upsert: true}, (err) => {
        debug  ('mongo stats: updated %s -> %j', this._name, upd);
        cb (err);
      });
    }
  }

  _flush (cb) {
    var upd = {$inc: {}};
    var some_added = false;

    _.forEach(this._cache, (value, key) => {
      if (value) {
        upd.$inc['counters.' + key] = value;
        some_added = true;
        this._cache[key] = 0;
      }
    });

    if (some_added) {
      this._coll().updateOne ({_id: this._id}, upd, {upsert: true}, (err) => {
        debug ('mongo stats: updated %s -> %j', this._name, upd);
        if (cb) cb (err);
      });
    }
    else {
      if (cb ) setImmediate (() => cb ());
    }
  }


  _ensureFlush() {
    if (this._flusher) return;

    this._flusher = setTimeout (() => {
      this._flusher = undefined;
      this._flush ();
    }, this._opts.flush_period || 100);
  }


  _cancelFlush() {
    if (this._flusher) {
      clearTimeout(this._flusher);
      this._flusher = undefined;
    }
  }


  _mongocl () {
    return this._factory._mongocl;
  }


  _coll () {
    return this._factory._coll;
  }


  incr(v, delta, cb) {
    if ((delta === null) || (delta === undefined)) delta = 1;

    if (!this._cache[v]) {
      this._cache[v] = 0;
    }

    this._cache[v] += delta;
    this._ensureFlush();

    if (cb) cb();
  }


  decr(v, delta, cb) {
    if ((delta === null) || (delta === undefined)) delta = 1;
    this.incr(v, -delta, cb);
  }

  opts (opts, cb) {
    if (!cb) {
      // get
      cb = opts;
      this._coll().findOne ({_id: this._id}, {projection: {opts: 1}}, (err, res) => {
        if (err) return cb (err);
        debug ('mongo stats - opts: get %s -> %j', this._name, res);
        cb (null, (res && res.opts) || {});
      });
    }
    else {
      // set
      var upd = {$set: {opts : opts}};
      this._coll().updateOne ({_id: this._id}, upd, {upsert: true}, (err) => {
        debug ('mongo stats: updated %s -> %j', this._name, upd);
        cb (err);
      });
    }
  }

  clear(cb) {
    this._cancelFlush();
    this._cache = {};

    var upd = {
      $unset: {
        counters: 1,
        opts: 1
      }
    };

    this._coll().updateOne ({_id: this._id}, upd, (err) => {
      cb (err);
    });
  }


  close (cb) {
    this._cancelFlush();
    this._flush (cb);
  }
}



class MongoStatsFactory {
  constructor(cl, coll, opts) {
    this._opts = opts || {};
    this._mongocl = cl;
    this._coll = coll;

    this._instances = {};

    debug ('created MongoStatsFactory on coll %s, opts %j', coll, opts);
  }

  static Type() { return 'mongo' }
  type() { return MongoStatsFactory.Type() }


  stats(ns, name, opts) {
    var k = name + '@' + ns;
    if (!this._instances [k]) {
      this._instances [k] = new MongoStats (ns, name, this);
      debug (`created MongoStats on ${k}`);
    }

    return this._instances [k];
  }

  queues (ns, opts, cb) {
    if (!cb) {
      cb = opts;
      opts = {};
    }

    if (opts.full) {
      this._coll.find({_id: {$regex: '^keuss:stats:' + ns}}).toArray (function (err, arr) {
        if (err) return cb (err);

        var res = {};
        arr.forEach (function (elem){
          res [elem.name] = {
            ns: elem.ns,
            name: elem.name,
            counters: elem.counters,
            opts: elem.opts,
            paused: elem.paused || false
          };
        });

        cb (null, res);
      });
    }
    else {
      this._coll.find({_id: {$regex: '^keuss:stats:' + ns}}).project ({_id: 1, name: 1}).toArray (function (err, arr) {
        if (err) return cb (err);

        var res = [];
        arr.forEach (function (elem){
          res.push (elem.name);
        });

        cb (null, res);
      });
    }
  }

  close (cb) {
    var tasks = [];

    // flush pending stats
    _.each (this._instances, (v, k) => {
      tasks.push ((cb) => {
        debug (`closing MongoStats ${k}`);
        v.close (cb);
      });
    });

    async.series ([
      (cb) => async.parallel (tasks, cb),
      (cb) => {
        debug (`closing MongoStatsFactory mongodb conn`);
        this._mongocl.close (cb);
      }
    ], cb);
  }
}

function creator (opts, cb) {
  if (!cb) {
    cb = opts;
    opts = null;
  }

  if (!opts) opts = {};

  debug ('initializing creator of MongoStatsFactory, opts %j', opts);

  var m_url = opts.url || 'mongodb://localhost:27017/keuss_stats';
  var m_coll = opts.coll || 'keuss_stats';

  debug ('initializing creator of MongoStatsFactory, connecting to %s', m_url);

  MongoClient.connect (m_url, { useNewUrlParser: true }, function (err, cl) {
    if (err) return cb (err);

    debug ('initializing creator of MongoStatsFactory, connected to %s', m_url);
    var coll = cl.db().collection (m_coll);
    cb (null, new MongoStatsFactory (cl, coll, opts));
  });
}

module.exports = creator;

