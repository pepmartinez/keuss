'use strict';

var _ =     require('lodash');
var async = require('async');

var MongoClient = require ('mongodb').MongoClient;
var mongo =       require ('mongodb');

var _s_opts = undefined;

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

    this._ensure_conn (err => {
      if (err) return;

      var upd = {
        $set: {
          ns: this._ns,
          name:   this._name,
        }
      };
      
      this._coll().updateOne ({_id: this._id}, upd, {upsert: true}, (err, ret) => {});
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
    var self = this;
    self._ensure_conn (function (err) {
      if (err) return;

      self._coll().findOne ({_id: self._id}, {fields: {counters: 1}}, function (err, res) {
        if (err) return cb (err);
        //  ('mongo stats: get %s -> %j', self._name, res);
        cb (null, (res && res.counters) || {});
      });
    });
  }


  _ensureFlush() {
    if (this._flusher) return;
    var self = this;

    this._flusher = setTimeout(function () {
      var upd = {$inc: {}};
      var some_added = false;

      _.forEach(self._cache, function (value, key) {
        if (value) {
          upd.$inc['counters.' + key] = value;
          some_added = true;    
          self._cache[key] = 0;
        }
      });

      if (some_added) {
        self._ensure_conn (function (err) {
          if (err) return;
    
          self._coll().updateOne ({_id: self._id}, upd, {upsert: true}, function (err) {
            //  ('mongo stats: updated %s -> %j', self._name, upd);
          });
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

  _ensure_conn (cb) {
    this._factory._ensure_conn (cb);
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
    var self = this;

    if (!cb) {
      // get
      cb = opts;
      self._ensure_conn (function (err) {
        if (err) return;

        self._coll().findOne ({_id: self._id}, {fields: {opts: 1}}, function (err, res) {
          if (err) return cb (err);
          //  ('mongo stats - opts: get %s -> %j', self._name, res);
          cb (null, (res && res.opts) || {});
        });
      });
    }
    else {
      // set
      self._ensure_conn (function (err) {
        if (err) return;
  
        var upd = {$set: {opts : opts}};
        self._coll().updateOne ({_id: self._id}, upd, {upsert: true}, function (err) {
          //  ('mongo stats: updated %s -> %j', self._name, upd);
          cb (err);
        });
      });
    }
  }
  
  topology (tplg, cb) {
    var self = this;

    if (!cb) {
      // get
      cb = tplg;
      self._ensure_conn (function (err) {
        if (err) return;

        self._coll().findOne ({_id: self._id}, {fields: {topology: 1}}, function (err, res) {
          if (err) return cb (err);
          //  ('mongo stats - topology: get %s -> %j', self._name, res);
          cb (null, (res && res.topology) || {});
        });
      });
    }
    else {
      // set
      self._ensure_conn (function (err) {
        if (err) return;
  
        var upd = {$set: {topology : tplg}};
        
        self._coll().updateOne ({_id: self._id}, upd, {upsert: true}, function (err) {
          //  ('mongo stats: updated %s -> %j', self._name, upd);
          cb (err);
        });
      });
    }
  }
  
  clear(cb) {
    this._cancelFlush();
    this._cache = {};
    var self = this;

    this._ensure_conn (function (err) {
      if (err) return cb (err);

      var upd = {
        $unset: {
          counters: 1, 
          opts: 1, 
          topology: 1
        }
      };

      self._coll().updateOne ({_id: self._id}, upd, function (err) {
        cb (err);
      });
    });
  }
}

class MongoStatsFactory {
  constructor(opts) {
    this._opts = opts || {};
    this._mongocl = null;
    this._coll = null;
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
    
    var self = this;

    this._ensure_conn (function (err) {
      if (err) return cb (err);

      if (opts.full) {
        self._coll.find({_id: {$regex: '^keuss:stats:' + ns}}).toArray (function (err, arr) {
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
        self._coll.find({_id: {$regex: '^keuss:stats:' + ns}}).project ({_id: 1, name: 1}).toArray (function (err, arr) {
          if (err) return cb (err);

          var res = [];
          arr.forEach (function (elem){
            res.push (elem.name);
          });

          cb (null, res);
        });
      }
    });
  }

  close() {
    this._mongocl.close();
  }

  _ensure_conn (cb) {
    if (this._mongocl) return cb ();

    var m_url = this._opts.url || 'mongodb://localhost:27017/keuss_stats';
    var m_coll = this._opts.coll || 'keuss_stats';
    var self = this;

    //  ('connecting to %s', m_url);
    MongoClient.connect (m_url, function (err, db) {
      if (err) return cb (err);

    //  ('connected to %s', m_url);
      self._mongocl = db;
      self._coll = db.collection (m_coll);
      cb ();
    });
  }
}

module.exports = MongoStatsFactory;
