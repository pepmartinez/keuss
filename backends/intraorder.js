const _ =     require ('lodash');
const async = require ('async');
const uuid =  require ('uuid');

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
    const q = { _id: entry.payload.iid || uuid.v4 () };
    const upd = { 
      $push: { q: entry }, 
      $inc: { qcnt: 1 },
      $set: { mature: entry.mature, tries: entry.tries },
    };
    const opts = { upsert: true };

    this._col.updateOne (q, upd, opts, (err, result) => {
      debug ('insert: updateOne (%j, %j, %j) => (%j, %j)', q, upd, opts, err, result);
      if (err) return callback (err);
      // TODO result.insertedCount must be 1
      callback (null, result.upsertedId || q._id);
    });
  }


  /////////////////////////////////////////
  // get element from queue
  get (callback) {
    // actually, a reserve followed by a commit
    this.reserve ((err, elem) => {
      if (err)   return callback (err);
      if (!elem) return callback ();

      this.commit (elem._id, (err, res) => {
        if (err) return callback (err);

        // clear _env: not needed here
        delete elem._env;
        callback (null, elem);
      }, elem);
    })
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

      // construct the real object to return
      const vq = v.q[0];
      vq._id = v._id;  // use the whole obj's _id
      vq.tries = v.tries
      vq._env = v; // pass along the whole obj too
      if (vq.payload._bsontype == 'Binary') vq.payload = vq.payload.buffer;
      callback (null, vq);
    });
  }


  //////////////////////////////////
  // commit previous reserve, by p.id
  commit (id, callback, obj) {
    if (!(obj || (obj && obj._id))) {
      // full obj must be passed to commit
      return callback ('full obj must be passed to commit');
    }

    const q  =  {
      _id: id,
      reserved: {$exists: true}
    };
    
    const upd = {
// do not alter mature on commit: leave it be
//      $set:   {
//        mature: Queue.nowPlusSecs (100 * this._opts.ttl)
//      },
      $pop: {q: -1},  // pop entry from queue
      $inc: { qcnt: -1 }, // one less element
      $unset: {reserved: ''}
    };

    if ((obj._env && obj._env.qcnt) > 1) {
      debug ('it is certain there are still entries in the intraqueue: set mature and tries');
      upd.$set = {
        mature: obj._env.q[1].mature,
        tries: obj._env.q[1].tries,
      }
    }
    else {
      // last in queue: set mature to distant future to get it out of the way while it's GCed
// not really, it'd impact if there were an insert in between
//      upd.$set.mature = Queue.nowPlusSecs (60*60*24*1000);
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

    const q =  {
      _id: id,
      reserved: {$exists: true}
    };

    const upd = {
      $set:   {mature: (next_t ? new Date (next_t) : Queue.now ())},
      $unset: {reserved: ''}
    };

    const opts = {};

    this._col.updateOne (q, upd, opts, (err, result) => {
      debug ('rollback: updateOne (%j, %j, %j) => (%j, %j)', q, upd, opts, err, result);
      if (err) return callback (err);
      callback (null, result && (result.modifiedCount == 1));
    });
  }


  //////////////////////////////////
  // queue size of non-mature elements only
  totalSize (callback) {
    const cursor = this._col.aggregate ([
      {$match: {
        qcnt: {$gt: 0}
      }},
      {$group:{_id:'t', v: {$sum: '$qcnt'}}}
    ]);

    cursor.toArray ((err, res) => {
      debug ('calculating schedSize: aggregation pipeline returns %o', res);
      if (err) return callback (err);
      if (res.length == 0) return callback (null, 0);
      callback (null, res[0].v);
    });
  }


  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
    const cursor = this._col.aggregate ([
      {$match: {
        mature: {$lte: Queue.now ()},
        qcnt: {$gt: 0}
      }},
      {$group:{_id:'t', v: {$sum: '$qcnt'}}}
    ]);

    cursor.toArray ((err, res) => {
      debug ('calculating schedSize: aggregation pipeline returns %o', res);
      if (err) return callback (err);
      if (res.length == 0) return callback (null, 0);
      callback (null, res[0].v);
    });
  }


  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
    const cursor = this._col.aggregate ([
      {$match: {
        mature: {$gt: Queue.now ()},
        reserved: {$exists: false},
        qcnt: {$gt: 0}
      }},
      {$group:{_id:'t', v: {$sum: '$qcnt'}}}
    ]);

    cursor.toArray ((err, res) => {
      debug ('calculating schedSize: aggregation pipeline returns %o', res);
      if (err) return callback (err);
      if (res.length == 0) return callback (null, 0);
      callback (null, res[0].v);
    });
  }


  //////////////////////////////////
  // queue size of reserved elements only
  resvSize (callback) {
    const cursor = this._col.aggregate ([
      {$match: {
        mature: {$gt: Queue.now ()},
        reserved: {$exists: true},
        qcnt: {$gt: 0}
      }},
      {$group:{_id:'t', v: {$sum: '$qcnt'}}}
    ]);

    cursor.toArray ((err, res) => {
      debug ('calculating schedSize: aggregation pipeline returns %o', res);
      if (err) return callback (err);
      if (res.length == 0) return callback (null, 0);
      callback (null, res[0].v);
    });
  }


  //////////////////////////////////////////////
  // remove by id
  remove (id, callback) {
    const q =  {
      _id: id,
      qcnt: { $eq: 1 },  // allow deletion ONLY if it has just one element in the intraqueue
      reserved: {$exists: false}
    };

    const opts = {};

    this._col.deleteOne (q, opts, (err, result) => {
      debug ('remove: deleteOne (%j, %j) => (%j, %j)', q, opts, err, result);
      if (err) return callback (err);
      callback (null, result && (result.deletedCount == 1));
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
    async.series ([
      cb => this._col.createIndex ({mature : 1, qcnt: 1}, cb),
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
      remove:   false
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





