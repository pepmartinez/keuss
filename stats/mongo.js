'use strict';

var _ = require('lodash');

var MongoClient = require ('mongodb').MongoClient;

/*
 * plain into a single mongo coll
*/
class MongoStats {
  constructor(ns, name, factory, opts) {
    this._ns = ns;
    this._name = name;
    this._id = 'keuss:stats:' + ns + ':' + name;
    this._opts = opts || {};
    this._factory = factory;
    this._cache = {};

    var upd = {
      $set: {
        ns:   this._ns,
        name: this._name,
      }
    };
      
    this._coll().updateOne ({_id: this._id}, upd, {upsert: true}, (err, ret) => {
//      console.log ('mongo stats created, ns %s, name %s, opts %j', ns, name, opts);
    });
  }


  type() { 
    return this._factory.type();
   }

   ns () {
     return this._ns;
   }
 
   name () {
     return this._name;
   }


  values(cb) {
    this._coll().findOne ({_id: this._id}, {fields: {counters: 1}}, (err, res) => {
      if (err) return cb (err);
    
//      console.log ('mongo stats: get %s -> %j', this._name, res);
      cb (null, (res && res.counters) || {});
    });
  }


  _ensureFlush() {
    if (this._flusher) return;
    var self = this;

    this._flusher = setTimeout (function () {
      var upd = {$inc: {}};
      var some_added = false;

      _.forEach(self._cache, (value, key) => {
        if (value) {
          upd.$inc['counters.' + key] = value;
          some_added = true;    
          self._cache[key] = 0;
        }
      });

      if (some_added) {
        self._coll().updateOne ({_id: self._id}, upd, {upsert: true}, (err) => {
//          console.log ('mongo stats: updated %s -> %j', self._name, upd);
        });
      }

      self._flusher = undefined;
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
      this._coll().findOne ({_id: this._id}, {fields: {opts: 1}}, (err, res) => {
        if (err) return cb (err);
//        console.log ('mongo stats - opts: get %s -> %j', this._name, res);
        cb (null, (res && res.opts) || {});
      });
    }
    else {
      // set
      var upd = {$set: {opts : opts}};
      this._coll().updateOne ({_id: this._id}, upd, {upsert: true}, (err) => {
//        console.log ('mongo stats: updated %s -> %j', this._name, upd);
        cb (err);
      });
    }
  }
  
  topology (tplg, cb) {
    if (!cb) {
      // get
      cb = tplg;

      this._coll().findOne ({_id: this._id}, {fields: {topology: 1}}, (err, res) => {
        if (err) return cb (err);
//        console.log ('mongo stats - topology: get %s -> %j', this._name, res);
        cb (null, (res && res.topology) || {});
      });
    }
    else {
      // set
      var upd = {$set: {topology : tplg}};
        
      this._coll().updateOne ({_id: this._id}, upd, {upsert: true}, (err) => {
//        console.log ('mongo stats: updated %s -> %j', this._name, upd);
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
        opts: 1, 
        topology: 1
      }
    };

    this._coll().updateOne ({_id: this._id}, upd, (err) => {
      cb (err);
    });
  }
}

class MongoStatsFactory {
  constructor(cl, coll, opts) {
    this._opts = opts || {};
    this._mongocl = cl;
    this._coll = coll;

//    console.log ('created MongoStatsFactory on coll %s, opts %j', coll, opts);
  }

  static Type() { return 'mongo' }
  type() { return Type() }

  stats(ns, name, opts) {
    return new MongoStats (ns, name, this);
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
            topology: elem.topology,
            opts: elem.opts
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

  close() {
    this._mongocl.close();
  }
}

function creator (opts, cb) {
  if (!cb) {
    cb = opts;
    opts = null;
  }

  if (!opts) opts = {};

//  console.log ('initializing creator of MongoStatsFactory, opts %j', opts);

  var m_url = opts.url || 'mongodb://localhost:27017/keuss_stats';
  var m_coll = opts.coll || 'keuss_stats';

//  console.log ('initializing creator of MongoStatsFactory, connecting to %s', m_url);

  MongoClient.connect (m_url, function (err, cl) {
    if (err) return cb (err);

//    console.log ('initializing creator of MongoStatsFactory, connected to %s', m_url);
    var coll = cl.collection (m_coll);
    cb (null, new MongoStatsFactory (cl, coll, opts));
  });
}

module.exports = creator;

