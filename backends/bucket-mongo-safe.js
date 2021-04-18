var async =     require ('async');
var _ =         require ('lodash');
var AsyncLock = require ('async-lock');


var debug = require('debug')('keuss:backend:BucketMongoSafe');

var MongoClient = require ('mongodb').MongoClient;
var mongo =       require ('mongodb');

var Queue =                     require ('../Queue');
var QFactory_MongoDB_defaults = require ('../QFactory-MongoDB-defaults');

var State = {
  Available: 1,
  Reserved:  2,
  Committed: 3,
  Rejected:  4,
  Deleted:   5
};


///////////////////////////////////////////////////////////////////////////////////////////////////////////////
class Bucket {
  ////////////////////////////////////////
  constructor (bucket_in_db, col, q, opts) {
    this._col = col;
    this._q = q;
    this._opts = opts;

    this._reject_delta_base = opts.reject_delta_base || 10000;
    this._reject_delta_factor = opts.reject_delta_factor || (opts.reserve_delay * 1000) || 30000;
    this._reject_timeout_grace = opts.reject_timeout_grace || (opts.reserve_delay * 200) || 6000;

    this._id = bucket_in_db._id;
    this._b = bucket_in_db.b;
    this._mature = bucket_in_db.mature;
    this._tries = bucket_in_db.tries;

    this._mature_t = this._mature.getTime();

    this._b_states = [];
    this._b_counts = {
      Available: 0,
      Reserved:  0,
      Committed: 0,
      Rejected:  0,
      Deleted:   0
    };

    this._last_b_idx = 0;

    _.each (this._b, (e) => {
      if (e) {
        this._b_states.push (State.Available);
        this._b_counts.Available++;
      }
      else {
        this._b_states.push (State.Deleted);
        this._b_counts.Deleted++;
      }
    });

    debug ('initialized Bucket, %O', this._b_counts);
    debug ('initialized Bucket, from %O', bucket_in_db);
  }

  id () {return this._id.toString();}
  exhausted () {return this._b_counts.Available == 0;}


  ////////////////////////////////////
  get_element (is_reserve) {
    // return null if Available count is 0
    if (this.exhausted ()) {
      debug ('Bucket:got_element: got no available elem (exhausted) -> %o', this._b_states);
      return null;
    }

    debug ('Bucket:got_element: look for next available elem starting at pos %d', this._last_b_idx);

    for (var i = this._last_b_idx; i <  this._b_states.length; i++) {
      if (this._b_states[i] == State.Available) {
        var elem = {};
        if (this._b[i].__p) {
          // add-headers: array contains both payload and headers, breaks backwards compat
          elem.payload = this._b[i].__p;
          elem.hdrs =    this._b[i].__h;
        }
        else {
          //  backwards compat, pre-headers: array contains whole payloads
          elem.payload = this._b[i];
        }

        elem.tries = this._tries;
        elem.mature = this._mature;
        elem._id = this.id () + ':' + i;

        // TODO optimization: set this._b[i] = null

        if (is_reserve) {
          this._b_states[i] = State.Reserved;
          this._b_counts.Reserved++;
        }
        else {
          this._b_states[i] = State.Committed;
          this._b_counts.Committed++;
        }

        this._b_counts.Available--;

        debug ('Bucket:got_element: got an available elem at pos %d, states are %o (%o)', i, this._b_states, this._b_counts);
        this._last_b_idx = i;
        return elem;
      }
    }

    // this should be unreachable
    debug ('Bucket:got_element: (WARNING, UNREACHABLE) got no available elem after iterating %d states -> %o', i, this._b_states);
    return null;
  }


  /////////////////////////////////////////
  _flush_delete_bucket (cb) {
    var q = {_id: this._id};
    debug ('Bucket: deleting whole bucket %o', q);

    this._col.deleteOne (q, (err, res) => {
      if (err) return cb({
        err: 'Bucket flush: mongodb error',
        e: err,
        q: q
      });

      if ((res && res.result && res.result.n) != 1) return cb({
        err: 'Bucket flush: exactly one must be deleted',
        e: err,
        q: q
      });

      debug ('Bucket: deleted whole bucket %o', q);
      cb (null, null);
    });
  }


  /////////////////////////////////////////
  _flush_bucket (cb) {
    var upd = {
      $set: {}
    };

    var has_update = false;
    var committed_pos = [];
    var mature = null;
    var timed_out = false;
    var is_reject = false;

    var time_left = this._mature_t - new Date().getTime();
    debug ('time left is %d, grace is %d', time_left, this._reject_timeout_grace);

    if (time_left < this._reject_timeout_grace) {
      debug ('bucket timed out, rejecting');
      timed_out = true;
    }

    if (this._b_counts.Committed) {
      _.each (this._b_states, (v, k) => {
        if (v == State.Committed) {
          committed_pos.push (k);
          upd.$set['b.' + k] = null;
        }
      });

      upd.$inc = {n: -(committed_pos.length)};
      has_update = true;

      debug ('Bucket: flushing %d committed entries', committed_pos.length);
    }

    if (
      timed_out ||
      (
        (this._b_counts.Available == 0) &&
        (this._b_counts.Reserved == 0)  &&
        (this._b_counts.Rejected != 0)
      )
    ) {
      debug ('Bucket: flushing entire bucket for retry (%o)', this._b_counts);
      is_reject = true;
      var tries = this._tries || 0;

      if (this._rollback_next_t) {
        mature = new Date (this._rollback_next_t);
      }
      else {
        var delta = this._reject_delta_factor * tries + this._reject_delta_base;
        mature = new Date (new Date().getTime () + delta)
      }

      upd.$set.mature = mature;
      upd.$unset = {reserved: 1};
      has_update = true;
    }

    if (has_update) {
      var q = {_id: this._id};

      debug ('update on bucket: q is %o, upd is %o', q, upd);

      this._col.updateOne (q, upd, (err, res) => {
        if (err) return cb({
          err: 'Bucket flush: mongodb error',
          e: err,
          q: q
        });

        if ((res && res.result && res.result.nModified) != 1) return cb({
          err: 'Bucket flush: exactly one must be updated',
          e: err,
          q: q,
          upd: upd
        });

        _.each (committed_pos, (v) => {
          this._b_states[v] = State.Deleted;
          this._b[v] = null;
          this._b_counts.Committed--;
          this._b_counts.Deleted++;
        });

        if (mature) this._q._signal_insertion_own (mature);

        debug ('Bucket: flushed ok, states are %o (%o)', this._b_states, this._b_counts);
        cb (null, is_reject ? null : this._b_counts);
      });
    }
    else {
      debug ('Bucket: nothing to flush');
      setImmediate (() => cb (null, this._b_counts));
    }
  }


  /////////////////////////////////////////
  flush (cb) {
    if (
      (this._b_counts.Available == 0) &&
      (this._b_counts.Reserved == 0)  &&
      (this._b_counts.Rejected == 0)
    ) {
      // delete entry
      this._flush_delete_bucket (cb);
    }
    else {
      this._flush_bucket (cb);
    }
  }
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////
class BucketSet {
  /////////////////////////////////
  constructor (col, q, opts) {
    this._opts = opts;
    this._q = q;
    this._col = col;

    this._reserve_delay =              this._opts.reserve_delay      || 30;
    this._flush_state_changes_period = this._opts.state_flush_period || 500;

    this._buckets = {};
    this._active_bucket = null;
    this._lock = new AsyncLock ();
  }


  ///////////////////////////////
  _read_bucket (cb) {
    var query = {
      mature: {$lte: Queue.now ()}
    };

    var update = {
      $set: {
        mature: Queue.nowPlusSecs (this._reserve_delay),
        reserved: new Date ()
      },
      $inc: {tries: 1}
    };

    var opts = {
      sort: {mature : 1},
      returnOriginal: false
    };

    debug ('reading a new bucket');

    this._col.findOneAndUpdate (query, update, opts, (err, result) => {
      if (err) return cb (err);

      var val = result && result.value;

      if (val) {
        debug ('read a bucket %s with %d elems', val._id.toString(), val.n);
        var bcket = new Bucket (val, this._col, this._q, this._opts);
        this._buckets[bcket.id()] = bcket;

        // is already exhausted?
        if (bcket.exhausted ()) {
          debug ('bucket %s already exhausted, read another', bcket.id());
          this._active_bucket = null;
          // TODO loop internally!!!!!
          cb ();
        }
        else {
          this._active_bucket = bcket;
          cb (null, this._active_bucket);
        }
      }
      else {
        debug ('no buckets, coll empty');
        cb ();
      }
    });
  }


  /////////////////////////////
  _ensure_bucket (cb) {
    debug ('BucketSet:_ensure_bucket: acquire lock');

    this._lock.acquire ('ensure-bucket', done => {
      debug ('BucketSet:_ensure_bucket: lock acquired');
      if (this._active_bucket) {
        debug ('BucketSet:_ensure_bucket: end (already present)');
        return done ();
      }

      this._read_bucket ((err, active_bucket) => {
        if (err) {
          debug ('BucketSet:_ensure_bucket: end (error) %o', err);
          return done (err);
        }

        if (!active_bucket) {
          debug ('BucketSet:_ensure_bucket: end (no bucket)');
          return done ();
        }

        // we got a bucket
        done (null, active_bucket);
      });
    }, (err, ret) => {
      debug ('BucketSet:_ensure_bucket: lock released');

      if (ret) {
        this._ensure_flush_state_changes ();
      }

      cb (err, ret);
    });
  }


  /////////////////////////////
  _obtain_element (is_reserve, cb) {
    this._ensure_bucket (err => {
      if (err) {
        debug ('BucketSet:_obtain_element: error %o', err);
        return cb (err);
      }

      if (!this._active_bucket) {
        debug ('BucketSet:_obtain_element: no active bucket', err);
        return cb ();  // coll empty or not mature
      }

      var elem = this._active_bucket.get_element (is_reserve);

      if (!elem) {
        debug ('BucketSet:getElement: active bucket exhausted, get another');
        this._active_bucket = null;
        setImmediate (() => this._obtain_element (is_reserve, cb));
      }
      else {
        debug ('BucketSet:getElement: returning element %o', elem);
        setImmediate (() => cb (null, elem));
      }
    });
  }


  /////////////////////////////
  get_element (cb) {
    this._obtain_element (false, cb);
  }


  /////////////////////////////
  reserve_element (cb) {
    this._obtain_element (true, cb);
  }


  /////////////////////////////
  commit_element (id, cb) {
    var aid = id.split (':');
    var bucket_id = aid[0];
    var bucket_idx = parseInt(aid[1]);

    var bucket = this._buckets[bucket_id];
    if (!bucket) return cb (null, false);
    if (bucket._b_states[bucket_idx] != State.Reserved) return cb (null, false);

    bucket._b_states[bucket_idx] = State.Committed;
    bucket._b_counts.Reserved--;
    bucket._b_counts.Committed++;

    debug ('Bucket:commit_element: committed elem at pos %d, states are %o (%o)', bucket_idx, bucket._b_states, bucket._b_counts);
    setImmediate (() => cb (null, true));
  }


  /////////////////////////////
  rollback_element (id, next_t, cb) {
    var aid = id.split (':');
    var bucket_id = aid[0];
    var bucket_idx = parseInt(aid[1]);

    var bucket = this._buckets[bucket_id];
    if (!bucket) return cb (null, false);
    if (bucket._b_states[bucket_idx] != State.Reserved) return cb (null, false);

    bucket._b_states[bucket_idx] = State.Rejected;
    bucket._b_counts.Reserved--;
    bucket._b_counts.Rejected++;

    if (!bucket._rollback_next_t) bucket._rollback_next_t = next_t;
    else if (bucket._rollback_next_t < next_t)bucket._rollback_next_t = next_t;

    debug ('Bucket:rollback_element: rolled-back elem at pos %d, states are %o (%o)', bucket_idx, bucket._b_states, bucket._b_counts);
    setImmediate (() => cb (null, true));
  }


  /////////////////////////////
  _flush_state_changes (cb) {
    this._flush_state_changes_timer = null;

    debug ('BucketSet:_flush_state_changes: tick');

    var tasks = {};
    _.each (this._buckets, (bucket, id) => {
      tasks[id] = (cb) => {
        debug ('BucketSet:_flush_state_changes: flushing bucket %s', bucket.id());
        bucket.flush (cb);
      };
    });

    async.parallel (tasks, (err, res) => {
      if (err) {
        debug ('BucketSet: error in flush-states: %o', err);
        return cb (err);
      }

      _.each (res, (v, k) => {
        if (_.isNull (v)) {
          delete this._buckets[k];
          debug ('BucketSet: removed finished bucket %s', k);

          if ((this._active_bucket) && (this._active_bucket.id() == k)) {
            this._active_bucket = null;
            debug ('BucketSet: removed finished ACTIVE bucket %s', k);
          }
        }
      });

      if (_.size (this._buckets) == 0) {
        debug ('BucketSet: empty, no buckets. stop flush');
        this._cancel_flush_state_changes ();
        return cb (null, true);
      }
      else {
        return cb ();
      }

      cb (err);
    });
  }


  /////////////////////////////
  _ensure_flush_state_changes () {
    if (this._flush_state_changes_timer) return;

    this._flush_state_changes_timer = setTimeout (() => {
      this._flush_state_changes ((err, stop) => {
        if (stop) return;
        this._ensure_flush_state_changes ();
      })
    }, this._flush_state_changes_period);

    debug ('BucketSet:_flush_state_changes: arm');
  }


  /////////////////////////////
  _cancel_flush_state_changes () {
    if (this._flush_state_changes_timer) {
      clearTimeout (this._flush_state_changes_timer);
      debug ('BucketSet:_flush_state_changes: stopped');
      this._flush_state_changes_timer = null;
    }
  }
}



///////////////////////////////////////////////////////////////////////////////////////////////////////////////
class BucketMongoSafeQueue extends Queue {

  /*

  options:
    bucket_max_size    || 1024;
    bucket_max_wait    || 500;
    reserve_delay      || 30;
    state_flush_period || 500;
    reject_delta_base || 10000;
    reject_delta_factor || (opts.reserve_delay * 1000) || 30000;
    reject_timeout_grace || (opts.reserve_delay * 0.8);
  */
  //////////////////////////////////////////////
  constructor (name, factory, opts, orig_opts) {
  //////////////////////////////////////////////
    super (name, factory, opts, orig_opts);

    this._factory = factory;
    this._col = factory._db.collection (name);
    this._ensureIndexes (err => {});

    this._insert_bucket = {
      _id: new mongo.ObjectID (),
      b: []
    };

    this._read_bucket = new BucketSet (this._col, this, opts);

    this._bucket_max_size = opts.bucket_max_size || 1024;
    this._bucket_max_wait = opts.bucket_max_wait || 500;

    debug ('created BucketMongoSafeQueue %s', name);
  }


  /////////////////////////////////////////
  static Type () {
  /////////////////////////////////////////
    return 'mongo:bucket-safe';
  }

  /////////////////////////////////////////
  type () {
  /////////////////////////////////////////
    return 'mongo:bucket-safe';
  }


  /////////////////////////////////////////
  // add element to queue
  insert (entry, callback) {
  /////////////////////////////////////////
    if (!this._insert_bucket.mature) this._insert_bucket.mature = entry.mature;
    else if (this._insert_bucket.mature.getTime () < entry.mature.getTime ()) this._insert_bucket.mature = entry.mature;

    this._insert_bucket.b.push ({
      __p: entry.payload,
      __h: (entry.hdrs || {})
    });

    var id = this._insert_bucket._id.toString () + ':' + this._insert_bucket.b.length;
    debug ('added to bucket, %s', id);

    if (this._insert_bucket.b.length >= this._bucket_max_size) {
      if (this._flush_timer) clearTimeout (this._flush_timer);
      this._flush_timer = null;

      debug ('cancelled periodic_flush');

      this._flush_bucket (callback);
    }
    else {
      if (this._insert_bucket.b.length == 1) {
        debug ('first insert of bucket, set periodic_flush');
        this._set_periodic_flush ();
      }

      setImmediate (() => callback (null, id));
    }
  }


  /////////////////////////////////////////
  // get element from queue
  get (callback) {
    this._read_bucket.get_element ((err, elem) => {
      if (err) return callback (err);
      if (elem && elem.payload._bsontype == 'Binary') elem.payload = elem.payload.buffer;
      if (elem && elem.tries > 0) elem.tries--;
      callback (null, elem);
    });
  }


  /////////////////////////////////////////
  // reserve element from queue
  reserve (callback) {
    this._read_bucket.reserve_element ((err, elem) => {
      if (err) return callback (err);
      if (elem && elem.payload._bsontype == 'Binary') elem.payload = elem.payload.buffer;
      if (elem && elem.tries > 0) elem.tries--;
      callback (null, elem);
    });
  }


  /////////////////////////////////////////
  // commit a reserved element from queue
  commit (id, callback) {
    this._read_bucket.commit_element (id, (err, elem) => {
      if (err) return callback (err);
      callback (null, elem);
    });
  }


  /////////////////////////////////////////
  // rollback a reserved element from queue
  rollback (id, next_t, callback) {
    this._read_bucket.rollback_element (id, next_t, (err, elem) => {
      if (err) return callback (err);
      callback (null, elem);
    });
  }


  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback) {
    this._col.aggregate ([
      {$group:{_id:'t', v: {$sum: '$n'}}}
    ], (err, cursor) => {
      if (err) return callback (err);

      cursor.toArray ((err, res) => {
        debug ('calculating totalSize: aggregation pipeline returns %o', res);
        if (err) return callback (err);
        if (res.length == 0) return callback (null, 0);
        callback (null, res[0].v);
      });
    });
  }


  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
    this._col.aggregate ([
      {$match: {mature: {$lte: Queue.now ()}}},
      {$group:{_id:'t', v: {$sum: '$n'}}}
    ], (err, cursor) => {
      if (err) return callback (err);

      cursor.toArray ((err, res) => {
        debug ('calculating size: aggregation pipeline returns %o', res);
        if (err) return callback (err);
        if (res.length == 0) return callback (null, 0);
        callback (null, res[0].v);
      });
    });
  }


  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
    this._col.aggregate ([
      {$match: {
        mature: {$gt: Queue.now ()},
        reserved: {$exists: false}
      }},
      {$group:{_id:'t', v: {$sum: '$n'}}}
    ], (err, cursor) => {
      if (err) return callback (err);

      cursor.toArray ((err, res) => {
        debug ('calculating schedSize: aggregation pipeline returns %o', res);
        if (err) return callback (err);
        if (res.length == 0) return callback (null, 0);
        callback (null, res[0].v);
      });
    });
  }

  //////////////////////////////////
  // queue size of non-mature elements only
  resvSize (callback) {
    this._col.aggregate ([
      {$match: {
        mature: {$gt: Queue.now ()},
        reserved: {$exists: true}
      }},
      {$group:{_id:'t', v: {$sum: '$n'}}}
    ], (err, cursor) => {
      if (err) return callback (err);

      cursor.toArray ((err, res) => {
        debug ('calculating resvSize: aggregation pipeline returns %o', res);
        if (err) return callback (err);
        if (res.length == 0) return callback (null, 0);
        callback (null, res[0].v);
      });
    });
  }


  /////////////////////////////////////////
  // get element from queue
  next_t (callback) {
    this._col.find ({}).limit(1).sort ({mature:1}).project ({mature:1}).next ((err, result) => {
      if (err) return callback (err);
      debug ('obtaining next_t: got %o', result && result.mature);
      callback (null, result && result.mature);
    });
  }


  /////////////////////////////////////////
  _drain_read (cb) {
    debug ('drain_read called');

    this._read_bucket._cancel_flush_state_changes ();
    this._read_bucket._flush_state_changes (err => {
      debug ('drain_read completed');
      cb (err);
    });
  }


  /////////////////////////////////////////
  _drain_insert (cb) {
    debug ('drain_insert called');

    if (this._insert_bucket.b.length) {
      if (this._flush_timer) clearTimeout (this._flush_timer);
      this._flush_timer = null;

      debug ('drain_insert flushing _insert_bucket');

      this._flush_bucket (cb);
    }
    else {
      debug ('drain_insert: nothing pending insertion, completed');
      cb ();
    }
  }


  /////////////////////////////////////////
  // empty local buffers
  drain (callback) {
    async.series ([
      cb => {this._in_drain = true; cb ();},
      cb => async.parallel ([
        cb => this._drain_read (cb),
        cb => this._drain_insert (cb),
      ], cb),
      cb => {debug ('drain stages completed'), cb ()},
      cb => {this._in_drain = false; this._drained = true; cb ()},
      cb => {this.cancel (); cb ()},
      cb => {debug ('drain completed'), cb ()}
    ], callback);
  }


  /////////////////////////////////////////
  _ensureIndexes (cb) {
    this._col.createIndex ({mature : 1}, err => cb (err));
  }


  /////////////////////////////////////////
  _set_periodic_flush () {
  /////////////////////////////////////////
    if (this._flush_timer) return;

    this._flush_timer = setTimeout (() => {
      this._flush_timer = null;

      debug ('flush_timer went off');

      if (this._insert_bucket.b.length) {
        this._flush_bucket ((err, res) => {
          if (err) {
            // keep retrying
            this._set_periodic_flush ();
          }
        });
      }
      else {
        // nothing to insert, stop
      }
    }, this._bucket_max_wait);

    debug ('_set_periodic_flush set, wait %d msecs', this._bucket_max_wait);
  }


  /////////////////////////////////////////
  _flush_bucket (callback) {
  /////////////////////////////////////////
    var bucket = this._insert_bucket;
    bucket.n = bucket.b.length;

    this._insert_bucket = {
      _id: new mongo.ObjectID (),
      b: []
    };

    debug ('flushing bucket %s with %d elems', bucket._id.toString(), bucket.b.length);

    this._col.insertOne (bucket, {}, (err, result) => {
      if (err) return callback (err);

      this._signal_insertion_own (bucket.mature);
      callback (null, bucket);
    });
  }


  /////////////////////////////////////////
  // get element from queue
  _get_bucket (callback) {
  /////////////////////////////////////////
    debug ('need to read a bucket');

    this._col.findOneAndDelete ({}, {sort: {_id : 1}}, (err, result) => {
      if (err) return callback (err);

      var val = result && result.value;

      if (val) {
        debug ('read a bucket %s with %d elems', val._id.toString(), val.n);
      }

      callback (null, val);
    });
  }


  ////////////////////////////////////////
  // redefine signalling of insertion:
  //
  // inhibit inherited one
  _signal_insertion (t) {
  }

  // and define own one
  _signal_insertion_own (t) {
    this._signaller.signalInsertion (t);
  }
};


class Factory extends QFactory_MongoDB_defaults {
  constructor (opts, mongo_conn) {
    super (opts);
    this._mongo_conn = mongo_conn;
    this._db = mongo_conn.db();
  }

  queue (name, opts) {
    var full_opts = {}
    _.merge(full_opts, this._opts, opts);
    return new BucketMongoSafeQueue (name, this, full_opts, opts);
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
    return BucketMongoSafeQueue.Type ();
  }

  capabilities () {
    return {
      sched:    false,
      reserve:  true,
      pipeline: false
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
