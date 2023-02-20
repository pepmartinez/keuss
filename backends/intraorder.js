const _ = require ('lodash');
const uuid = require ('uuid');

const MongoClient = require ('mongodb').MongoClient;
const mongo =       require ('mongodb');

const Queue =                     require ('../Queue');
const QFactory_MongoDB_defaults = require ('../QFactory-MongoDB-defaults');

const debug = require('debug')('keuss:Queue:intraqueue');


class IntraOrderedQueue extends Queue {

  //////////////////////////////////////////////
  constructor (name, factory, opts, orig_opts) {
    super (name, factory, opts, orig_opts);

    this._factory = factory;
    this._col = factory._db.collection (name);
    this.ensureIndexes (err => {});
  }


  /////////////////////////////////////////
  static Type () {
    return 'mongo:intraorder';
  }
  

  /////////////////////////////////////////
  type () {
    return 'mongo:intraorder';
  }

  /////////////////////////////////////////
  // add element to queue
  insert (entry, callback) {
    const q = { iid: entry.payload.iid || uuid.v4 () };
    const upd = { 
      $push: { q: entry }, 
      $inc: { qcnt: 1 },
      $set: {mature: entry.mature, tries: entry.tries},
    };
    const opts = { upsert: true };

    this._col.updateOne (q, upd, opts, (err, result) => {
      debug ('insert: updateOne (%j, %j, %j) => (%j, %j)', q, upd, opts, err, result);
      if (err) return callback (err);
      // TODO result.insertedCount must be 1
      callback (null, result.upsertedId);
    });
  }


  /////////////////////////////////////////
  // get element from queue
  get (callback) {
    const q = {
      mature: {$lte: Queue.nowPlusSecs (0)},
    };

    const updt = [{
      $set: {
        mature: Queue.nowPlusSecs (100 * this._opts.ttl)
      }
    }];

    const opts = {
      sort: {mature : 1}
    };

    this._col.findOneAndUpdate (q, updt, opts, (err, result) => {
      if (err) return callback (err);
      const v = result && result.value;
      if (!v) return callback ();
      if (v.payload._bsontype == 'Binary') v.payload = v.payload.buffer;
      callback (null, v);
    });
  }


  //////////////////////////////////
  // reserve element: call cb (err, pl) where pl has an id
  reserve (callback) {
    const delay = this._opts.reserve_delay || 120;

    const q = {
      mature: {$lte: Queue.nowPlusSecs (0)},
      qcnt: { $gt: 0}
    };

    const upd = {
      $set: {
        mature: Queue.nowPlusSecs (delay), 
        reserved: new Date ()
      },
      $inc: {tries: 1}
    };

    const opts = {
      sort: {mature : 1},
      returnDocument: 'before'
    };

    this._col.findOneAndUpdate (q, upd, opts, (err, result) => {
      debug ('reserve: findOneAndUpdate (%j, %j, %j) => (%j, %j)', q, upd, opts, err, result);
      if (err) return callback (err);
      const v = result && result.value;
      if (!v) return callback ();
      const vq = v.q[0];
      vq._id = v._id;
      vq.tries = v.tries
      vq._env = v;
      if (vq.payload._bsontype == 'Binary') vq.payload = vq.payload.buffer;
      callback (null, vq);
    });
  }


  //////////////////////////////////
  // commit previous reserve, by p.id
  commit (id, callback, obj) {
    if (!(obj || obj._id)) {
      // full obj must be passed to commit
      return callback ('full obj must be passed to commit');
    }

    let q;

    try {
      q =  {
        _id: (_.isString(id) ? new mongo.ObjectId (id) : id),
        reserved: {$exists: true}
      };
    }
    catch (e) {
      return callback ('id [' + id + '] can not be used as rollback id: ' + e);
    }

    const upd = {
      $set:   {
        mature: Queue.nowPlusSecs (100 * this._opts.ttl)
      },
      $pop: {q: -1},  // pop entry from queue
      $inc: { qcnt: -1 }, // one less element
      $unset: {reserved: ''}
    };

    if (obj._env.qcnt > 1) {
      debug ('it is certain there are still entries in the intraqueue: set mature and tries');
      upd.$set.mature = obj._env.q[1].mature;
      upd.$set.tries = obj._env.q[1].tries;
    }
    else {
      // last in queue: set mature to distant future to get it out of the way while it's GCed
      upd.$set.mature = Queue.nowPlusSecs (60*60*24*1000);
    }

    const opts = {};

    this._col.updateOne (q, upd, opts, (err, result) => {
      debug ('commit: updateOne (%j, %j, %j) => (%j, %j)', q, upd, opts, err, result);
      if (err) return callback (err);
      callback (null, result && (result.modifiedCount == 1));
    });
  }


  //////////////////////////////////
  // rollback previous reserve, by p.id
  rollback (id, next_t, callback) {
    if (_.isFunction (next_t)) {
      callback = next_t;
      next_t = null;
    }

    try {
      var query =  {
        _id: (_.isString(id) ? new mongo.ObjectID (id) : id),
        reserved: {$exists: true}
      };
    }
    catch (e) {
      return callback ('id [' + id + '] can not be used as rollback id: ' + e);
    }

    var update = {
      $set:   {mature: (next_t ? new Date (next_t) : Queue.now ())},
      $unset: {reserved: ''}
    };

    this._col.updateOne (query, update, {}, (err, result) => {
      if (err) return callback (err);
      callback (null, result && (result.modifiedCount == 1));
    });
  }


  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback) {
    var q = {
      processed: {$exists: false}
    };

    var opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
    var q = {
      processed: {$exists: false},
      mature : {$lte : Queue.now ()}
    };

    var opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
    var q = {
      mature : {$gt : Queue.now ()},
      processed: {$exists: false},
      reserved: {$exists: false}
    };

    var opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////
  // queue size of reserved elements only
  resvSize (callback) {
    var q = {
      mature : {$gt : Queue.now ()},
      processed: {$exists: false},
      reserved: {$exists: true}
    };

    var opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////////////////
  // remove by id
  remove (id, callback) {
    var query;

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

    var updt = {
      $set:   {
        processed: new Date (),
        mature: Queue.nowPlusSecs (100 * this._opts.ttl),
        removed: true
      },
    };

    var opts = {};

    this._col.updateOne (query, updt, opts, (err, result) => {
      if (err) return callback (err);
      callback (null, result && (result.modifiedCount == 1));
    });
  }


  /////////////////////////////////////////
  // get element from queue
  next_t (callback) {
    this._col
    .find ()
    .limit(1)
    .sort ({mature:1})
    .project ({mature:1})
    .next ((err, result) => {
      if (err) return callback (err);
      callback (null, result && result.mature);
    });
  }


  ///////////////////////////////////////////////////////////////////////////////
  // private parts

  //////////////////////////////////////////////////////////////////
  // create needed indexes for O(1) functioning
  ensureIndexes (cb) {
    this._col.createIndex ({mature : 1}, err => {
      if (err) return cb (err);
      cb (err);
    });
  }
}


class Factory extends QFactory_MongoDB_defaults {
  constructor (opts, mongo_conn) {
    super (opts);
    this._mongo_conn = mongo_conn;
    this._db = mongo_conn.db();
  }

  queue (name, opts) {
    var full_opts = {};
    _.merge(full_opts, this._opts, opts);
    return new IntraOrderedQueue (name, this, full_opts, opts);
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
    return IntraOrderedQueue.Type ();
  }

  capabilities () {
    return {
      sched:    true,
      reserve:  true,
      pipeline: false,
      tape:     false,
      remove:   true
    };
  }
}

function creator (opts, cb) {
  var _opts = opts || {};
  var m_url = _opts.url || 'mongodb://localhost:27017/keuss';

  MongoClient.connect (m_url, { useNewUrlParser: true }, (err, cl) => {
    if (err) return cb (err);
    var F = new Factory (_opts, cl);
    F.async_init (err => cb (null, F));
  });
}

module.exports = creator;





