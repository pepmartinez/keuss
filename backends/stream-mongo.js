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

    this._col = factory._db.collection (name);
    this._groups_str = this._opts.groups || 'A,B:C';
    this._groups_vector = this._groups_str.split (/[:,;.-]/).map (i => i.trim());
    this._gid = this._opts.group || this._groups_vector[0];

    debug ('created with groups %j and gid %s (used for pop/reserve only)', this._groups_vector, this._gid);
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
  _vector (item) {
    const r = {};
    this._groups_vector.forEach (i => r[i] = item);
    return r;
  }


  /////////////////////////////////////////
  // add element to queue
  insert (entry, callback) {
    const mtr = entry.mature;
    const tr =  entry.tries;

    entry.tries =     this._vector (tr);
    entry.mature =    this._vector (mtr);
    entry.processed = this._vector (false);
    
    entry.t = new Date();

    this._col.insertOne (entry, {}, (err, result) => {
      if (err) return callback (err);
      callback (null, result.insertedId);
      this._groups_vector.forEach (i => this._stats.incr (`stream.${i}.put`));
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
      this._stats.incr (`stream.${gid}.get`);
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
      this._stats.incr (`stream.${gid}.reserve`);
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
      this._stats.incr (`stream.${gid}.commit`);
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
      this._stats.incr (`stream.${gid}.rollback`);
    });
  }


  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback, gid) {
    const gr = gid || this._gid;

    const q = {};
    q[`processed.${gr}`] = false;

    const opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback, gid) {
    const gr = gid || this._gid;

    const q = {};
    q[`processed.${gr}`] = false;
    q[`mature.${gr}`] = {$lte: Queue.now()};

    const opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback, gid) {
    const gr = gid || this._gid;

    const q = {};
    q[`processed.${gr}`] = false;
    q[`reserved.${gr}`] = {$exists: false};
    q[`mature.${gr}`] = {$gt: Queue.now()};

    const opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////
  // queue size of reserved elements only
  resvSize (callback, gid) {
    const gr = gid || this._gid;

    const q = {};
    q[`processed.${gr}`] = false;
    q[`reserved.${gr}`] = {$exists: true};
    q[`mature.${gr}`] = {$gt: Queue.now()};

    const opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  /////////////////////////////////////////
  // get element from queue
  next_t (callback, gid) {
    const gr = gid || this._gid;
    
    const q = {};
    q[`processed.${gr}`] = false;

    const sort = {};
    sort[`mature.${gr}`] = 1;

    this._col
    .find (q)
    .limit(1)
    .sort (sort)
    .project ({mature:1})
    .next ((err, result) => {
      if (err) return callback (err);
      debug ('next_t with git %s: got %o', gr, result);
      callback (null, result && result.mature && result.mature[gr]);
    });
  }


  //////////////////////////////////
  // queue size of non-mature elements only.
  // COMMENTED OUT: takes 1 sec per each 100K elements in collection
  /*
  extra_info (callback) {
    const cursor = this._col.aggregate ([
      {
        $group : {
          _id : "v",
          r: {
            $accumulator: {
              init: `function() { 
                return { size: {}, totalSize: {}, resvSize: {}, schedSize: {}, processed: {} }
              }`,
              accumulate: `function(state, mature, reserved, processed) { 
                for (const gr in mature) {
                  if (!state.size[gr])      state.size[gr] = 0;
                  if (!state.totalSize[gr]) state.totalSize[gr] = 0;
                  if (!state.resvSize[gr])  state.resvSize[gr] = 0;
                  if (!state.schedSize[gr]) state.schedSize[gr] = 0;
                  if (!state.processed[gr]) state.processed[gr] = 0;

                  const mtr = (mature[gr].getTime() < new Date().getTime());
                  const rsv = (reserved && ((reserved[gr] != null) && (reserved[gr] != undefined)));
                  const prc = processed[gr];

                  if (prc) {
                    state.processed[gr]++;
                  }
                  else {
                    state.totalSize[gr]++;

                    if (mtr) {
                      state.size[gr]++;
                    }
                    else {
                      if (rsv) state.resvSize[gr]++;
                      else     state.schedSize[gr]++;
                    }
                  }
                }

                return state;
              }`,
              accumulateArgs: ['$mature', '$reserved', '$processed'],  
              merge: `function(state1, state2) { 
                const res = { size: {}, totalSize: {}, resvSize: {}, schedSize: {} }
                for (const gr in state1) {
                  res.size[gr] =      state1.size[gr] +      (state2.size[gr] || 0)
                  res.totalSize[gr] = state1.totalSize[gr] + (state2.totalSize[gr] || 0)
                  res.resvSize[gr] =  state1.resvSize[gr] +  (state2.resvSize[gr] || 0)
                  res.schedSize[gr] = state1.schedSize[gr] + (state2.schedSize[gr] || 0)
                  res.processed[gr] = state1.processed[gr] + (state2.processed[gr] || 0)
                }
                for (const gr in state2) {
                  if (!state1.size[gr])      res.size[gr] =      state2.size[gr]
                  if (!state1.totalSize[gr]) res.totalSize[gr] = state2.totalSize[gr]
                  if (!state1.schedSize[gr]) res.schedSize[gr] = state2.schedSize[gr]
                  if (!state1.resvSize[gr])  res.resvSize[gr] =  state2.resvSize[gr]
                  if (!state1.processed[gr]) res.processed[gr] = state2.processed[gr]
                }
                return res
              }`,
              lang: "js"
            }
          }
        }
      }

    ]);




    cursor.toArray ((err, res) => {
      debug ('calculating resvSize: aggregation pipeline returns %o', err);
      debug ('calculating resvSize: aggregation pipeline returns %o', res);
      if (err) return callback (err);
      if (res.length == 0) return callback (null, 0);
      callback (null, res[0].r);
    });
  }
*/


  ///////////////////////////////////////////////////////////////////////////////
  // private parts

  //////////////////////////////////////////////////////////////////
  // create needed indexes for O(1) functioning
  _ensureIndexes (cb) {
    const tasks = [];

    this._groups_vector.forEach (i => {
      const idx = {};
      idx[`mature.${i}`] = 1;
      tasks.push (cb => this._col.createIndex (idx, cb));
    });
    tasks.push (cb => this._col.createIndex ({t: 1}, {expireAfterSeconds: this._opts.ttl}, cb));
    async.series (tasks, err => cb (err, this));
  }
}


class Factory extends QFactory_MongoDB_defaults {
  constructor (opts, mongo_conn) {
    super (opts);
    this._mongo_conn = mongo_conn;
    this._db = mongo_conn.db();
  }

  queue (name, opts, cb) {
    if (!cb) {
      cb = opts;
      opts = {};
    }
    
    const full_opts = {};
    _.merge(full_opts, this._opts, opts);
    const q = new StreamMongoQueue (name, this, full_opts, opts);
    q._ensureIndexes (cb);
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
      remove:   false,
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





