const _ =     require ('lodash');
const async = require ('async');

const MongoClient = require ('mongodb').MongoClient;
const mongo =       require ('mongodb');

const Queue =                     require ('../Queue');
const QFactory_MongoDB_defaults = require ('../QFactory-MongoDB-defaults');

var debug = require('debug')('keuss:Queue:StreamMongo');

class StreamMongoQueue extends Queue {

  //////////////////////////////////////////////
  constructor (name, factory, opts, orig_opts) {
    super (name, factory, opts, orig_opts);

    if (!this._opts.ttl) this._opts.ttl = 3600;

    this._factory = factory;
    this._col = factory._db.collection (name);
    this._gid = this._opts.group || 'a';
    this.ensureIndexes (function (err) {});
  }


  /////////////////////////////////////////
  static Type () {
    return 'mongo:stream';
  }


  /////////////////////////////////////////
  type () {
    return 'mongo:stream';
  }


  /////////////////////////////////////////
  // add element to queue
  insert (entry, callback) {
    const mtr = entry.mature;
    const tr = entry.tries;

    entry.tries = {a: tr, b: tr, c: tr, d: tr};
    entry.mature = {a: mtr, b: mtr, c: mtr, d: mtr};
    entry.processed = {a: false, b: false, c: false, d: false};
    
    entry.t = new Date();

    this._col.insertOne (entry, {}, (err, result) => {
      if (err) return callback (err);
      // TODO result.insertedCount must be 1
      callback (null, result.insertedId);
    });
  }


  /////////////////////////////////////////
  // get element from queue
  get (callback) {
    const gid = this._gid;
    const q = {};

    q[`mature.${gid}`] = {$lte: Queue.nowPlusSecs (0)};
    q[`processed.${gid}`] = false;

    const updt = {
      $set: {}
    };
    updt.$set[`processed.${gid}`] = new Date ();
    updt.$set[`mature.${gid}`] = Queue.nowPlusSecs (100 * this._opts.ttl);

    const opts = {
      sort: {}
    };
    opts.sort[`mature.${gid}`] = 1;

    debug ('get() with q %O, upd %O, opts %o', q, updt, opts);

    this._col.findOneAndUpdate (q, updt, opts, (err, result) => {
      if (err) return callback (err);
      const v = result && result.value;
      if (!v) return callback ();
      if (v.payload._bsontype == 'Binary') v.payload = v.payload.buffer;
      v.mature = v.mature[gid];
      v.tries = v.tries[gid];
      delete v.processed;
      delete v.t;
      callback (null, v);
    });
  }


  //////////////////////////////////
  // reserve element: call cb (err, pl) where pl has an id
  reserve (callback) {
    const gid = this._gid;
    const delay = this._opts.reserve_delay || 120;
    
    const q = {};

    q[`mature.${gid}`] = {$lte: Queue.nowPlusSecs (0)};
    q[`processed.${gid}`] = false;

    const updt = {
      $set: {},
      $inc: {}
    };
    updt.$set[`reserved.${gid}`] = new Date ();
    updt.$set[`mature.${gid}`] = Queue.nowPlusSecs (delay);
    updt.$inc[`tries.${gid}`] = 1;

    const opts = {
      sort: {},
      returnDocument: 'before'
    };
    opts.sort[`mature.${gid}`] = 1;

    debug ('reserve() with q %O, upd %O, opts %o', q, updt, opts);

    this._col.findOneAndUpdate (q, updt, opts, (err, result) => {
      if (err) return callback (err);
      const v = result && result.value;
      if (!v) return callback ();
      if (v.payload._bsontype == 'Binary') v.payload = v.payload.buffer;
      v.mature = v.mature[gid];
      v.tries = v.tries[gid];
      delete v.processed;
      delete v.t;
      callback (null, v);
    });
  }


  //////////////////////////////////
  // commit previous reserve, by p.id
  commit (id, callback) {
    const gid = this._gid;
    let q;

    try {
      q =  {
        _id: (_.isString(id) ? new mongo.ObjectID (id) : id),
      };
      q[`reserved.${gid}`] = {$exists: true};
    }
    catch (e) {
      return callback ('id [' + id + '] can not be used as rollback id: ' + e);
    }

    const updt = {
      $set:   {},
      $unset: {}
    };
    updt.$set[`processed.${gid}`] = new Date ();
    updt.$set[`mature.${gid}`] = Queue.nowPlusSecs (100 * this._opts.ttl);
    updt.$unset[`reserved.${gid}`] = '';

    const opts = {};

    debug ('commit() with q %O, upd %O, opts %o', q, updt, opts);

    this._col.updateOne (q, updt, opts, (err, result) => {
      if (err) return callback (err);
      callback (null, result && (result.modifiedCount == 1));
    });
  }


  //////////////////////////////////
  // rollback previous reserve, by p.id
  rollback (id, next_t, callback) {
    const gid = this._gid;
    let q;

    if (_.isFunction (next_t)) {
      callback = next_t;
      next_t = null;
    }

    try {
      q =  {
        _id: (_.isString(id) ? new mongo.ObjectID (id) : id),
      };
      q[`reserved.${gid}`] = {$exists: true};
    }
    catch (e) {
      return callback ('id [' + id + '] can not be used as rollback id: ' + e);
    }

    const updt = {
      $set:   {},
      $unset: {}
    };
    updt.$set[`mature.${gid}`] = (next_t ? new Date (next_t) : Queue.now ());
    updt.$unset[`reserved.${gid}`] = '';

    const opts = {};

    debug ('rollback() with q %O, upd %O, opts %o', q, updt, opts);

    this._col.updateOne (q, updt, opts, (err, result) => {
      if (err) return callback (err);
      callback (null, result && (result.modifiedCount == 1));
    });
  }


  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback) {
    // TODO
    const q = {
      processed: {$exists: false}
    };

    const opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
    // TODO
    const q = {
      processed: {$exists: false},
      mature : {$lte : Queue.now ()}
    };

    const opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
    // TODO
    const q = {
      mature : {$gt : Queue.now ()},
      processed: {$exists: false},
      reserved: {$exists: false}
    };

    const opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////
  // queue size of reserved elements only
  resvSize (callback) {
    // TODO
    const q = {
      mature : {$gt : Queue.now ()},
      processed: {$exists: false},
      reserved: {$exists: true}
    };

    const opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////////////////
  // remove by id
  // TODO
  remove (id, callback) {
    let query;

    try {
      query =  {
        _id: (_.isString(id) ? new mongo.ObjectID (id) : id),
        processed: {$exists: false},
        reserved: {$exists: false}
      };
    }
    catch (e) {
      return callback ('id [' + id + '] can not be used as remove id: ' + e);
    }

    const updt = {
      $set:   {processed: new Date (), removed: true},
    };

    const opts = {};

    this._col.updateOne (query, updt, opts, (err, result) => {
      if (err) return callback (err);
      callback (null, result && (result.modifiedCount == 1));
    });
  }


  /////////////////////////////////////////
  // get element from queue
  next_t (callback) {
    const gid = this._gid;
    const q = {};
    const sort = {};
    q[`processed.${gid}`] = false;
    sort[`mature.${gid}`] = 1;
    this._col
    .find (q)
    .limit(1)
    .sort (sort)
    .project ({mature:1})
    .next ((err, result) => {
      if (err) return callback (err);
      debug ('next_t with git %s: got %o', gid, result);
      callback (null, result && result.mature && result.mature[gid]);
    });
  }


  ///////////////////////////////////////////////////////////////////////////////
  // private parts

  //////////////////////////////////////////////////////////////////
  // create needed indexes for O(1) functioning
  ensureIndexes (cb) {
    async.series ([
      cb => this._col.createIndex ({"mature.a" : 1}, cb),
      cb => this._col.createIndex ({"mature.b" : 1}, cb),
      cb => this._col.createIndex ({"mature.c" : 1}, cb),
      cb => this._col.createIndex ({"mature.d" : 1}, cb),
      cb => this._col.createIndex ({t: 1}, {expireAfterSeconds: this._opts.ttl}, cb),
    ], cb);
  }
}


class Factory extends QFactory_MongoDB_defaults {
  constructor (opts, mongo_conn) {
    super (opts);
    this._mongo_conn = mongo_conn;
    this._db = mongo_conn.db();
  }

  queue (name, opts) {
    const full_opts = {};
    _.merge(full_opts, this._opts, opts);
    return new StreamMongoQueue (name, this, full_opts, opts);
  }

  close (cb) {
    super.close (() => {
      if (this._mongo_conn) {
        this._mongo_conn.close ();
        this._mongo_conn = null;
      }

      if (cb) return cb ();
    });
  }

  type () {
    return StreamMongoQueue.Type ();
  }

  capabilities () {
    return {
      sched:    true,
      reserve:  true,
      pipeline: false,
      tape:     true,
      remove:   true,
      stream:   true
    };
  }
}

function creator (opts, cb) {
  const _opts = opts || {};
  const m_url = _opts.url || 'mongodb://localhost:27017/keuss';

  MongoClient.connect (m_url, { useNewUrlParser: true }, (err, cl) => {
    if (err) return cb (err);
    const F = new Factory (_opts, cl);
    F.async_init (err => cb (null, F));
  });
}

module.exports = creator;





