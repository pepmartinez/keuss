var async = require ('async');
var _ =     require ('lodash');

var debug = require('debug')('keuss:backend:BucketMongoSafe');

var MongoClient = require ('mongodb').MongoClient;
var mongo =       require ('mongodb');

var Queue =    require ('../Queue');
var QFactory = require ('../QFactory');

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
  constructor (bucket_in_db, col, opts) {
    this._col = col;
    this._opts = opts;

    this._id = bucket_in_db._id;
    this._b = bucket_in_db.b;
    this._mature = bucket_in_db.mature;
    this._tries = bucket_in_db.tries;

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
  }

  id () {return this._id.toString();}
  exhausted () {return this._b_counts.Available == 0;}

  
  ////////////////////////////////////
  get_element (is_reserve) {
    // return null if Available count is 0
    if (this.exhausted ()) {
      debug ('Bucket:got_element: got no available elem after iterating %d states -> %o', i, this._b_states);
      return null;
    }

    debug ('Bucket:got_element: look for next available elem starting at pos %d', this._last_b_idx);
        
    for (var i = this._last_b_idx; i <  this._b_states.length; i++) {
      if (this._b_states[i] == State.Available) {
        var elem = this._b[i];
        elem.tries = this._tries;
        elem.mature = this._mature;
        elem._id = this.id () + ':' + i;

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
  _flush_update_bucket (cb) {
    var upd = {};
    var committed_pos = [];

    _.each (this._b_states, (v, k) => {
      if (v == State.Committed) {
        committed_pos.push (k);
        upd['b.' + k] = null;
      }
    });
    
    if (committed_pos.length) {
      upd = {
        '$inc': {n: -(committed_pos.length)},
        '$set': upd
      };
    
      debug ('Bucket: got %d elements to commit: %o, %o', committed_pos.length, committed_pos, upd);
    
      var q = {_id: this._id};
    
      this._col.updateOne (q, upd, (err, res) => {
        if (err) return cb({
          err: 'Bucket flush: mongodb error',
          e: err,
          q: q,
          upd: upd
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
    
        debug ('Bucket: flushed ok, states are %o (%o)', this._b_states, this._b_counts);
        cb (null, this._b_counts);
      });
    }
    else {
      debug ('Bucket: nothing to commit');
      setImmediate (() => cb ());
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
      this._flush_update_bucket (cb);
    }
  }
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////
class BucketSet {
  /////////////////////////////////
  constructor (col, opts) {
    this._opts = opts;
    this._col = col;
    this._reserve_delay = this._opts.reserve_delay || 30;
    this._flush_state_changes_period = this._opts.state_flush_period || 500;

    this._buckets = {

    };

    this._active_bucket = null;
  }


  ///////////////////////////////
  _read_bucket (cb) {
    var query = {
      mature: {$lte: Queue.nowPlusSecs (0)}
    };

    var update = {
      $set: {mature: Queue.nowPlusSecs (this._reserve_delay), reserved: new Date ()},
      $inc: {tries: 1}
    };
    
    var opts = {
      sort: {mature : 1}, 
      returnOriginal: true
    };
    
    this._col.findOneAndUpdate (query, update, opts, (err, result) => {
      if (err) return callback (err);
        
      var val = result && result.value;

      if (val) {
        debug ('read a bucket %s with %d elems', val._id.toString(), val.n);
        var bcket = new Bucket (val, this._col, this._opts);
        this._buckets[bcket.id()] = bcket;

        // is already exhausted?
        if (bcket.exhausted ()) {
          debug ('bucket %s already exhausted, read another', bcket.id());
          this._active_bucket = null;
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
  _obtain_element (is_reserve, cb) {
    if (!this._active_bucket) {
      return this._read_bucket ((err, active_bucket) => {
        if (err) return cb (err);          // error
        if (!active_bucket) return cb ();  // coll empty or not mature

        // we got a bucket
        this._ensure_flush_state_changes ();
        this._obtain_element (is_reserve, cb);
      }); 
    }
    else {
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
    }
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
  }


  rollback_element (id, cb) {}


  /////////////////////////////
  _flush_state_changes (cb) {
    this._flush_state_changes_timer = null;

    debug ('BucketSet:_flush_state_changes: tick');

    var tasks = {};
    _.each (this._buckets, (bucket, id) => {
      tasks[id] = (cb) => {
        debug ('BucketSet:_flush_state_changes: flushing bucker %s', bucket.id());
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
  
  //////////////////////////////////////////////
  constructor (name, factory, opts) {
  //////////////////////////////////////////////
    super (name, factory, opts);

    this._factory = factory;
    this._col = factory._mongo_conn.collection (name);
    this._ensureIndexes (function (err) {});

    this._insert_bucket = {
      _id: new mongo.ObjectID (),
      b: []
    };
    
    this._read_bucket = new BucketSet (this._col, opts);

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
    if (this._insert_bucket.b.length == 0) this._insert_bucket.mature = entry.mature;
    this._insert_bucket.b.push (entry.payload);
    var id = this._insert_bucket._id.toString () + '--' + this._insert_bucket.b.length;
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

      setImmediate (function () {callback (null, id);}); 
    }
  }
  
  
  /////////////////////////////////////////
  // get element from queue
  get (callback) {
    this._read_bucket.get_element ((err, elem) => {
      if (err) return callback (err);
      callback (null, elem);
    });
  }


  /////////////////////////////////////////
  // reserve element from queue
  reserve (callback) {
    this._read_bucket.reserve_element ((err, elem) => {
      if (err) return callback (err);
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
    this._read_bucket.rollback_element (id, (err, elem) => {
      if (err) return callback (err);
      callback (null, elem);
    });
  }


  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback) {
    this._col.aggregate ([
      {$group:{_id:'t', v: {$sum: '$n'}}}
    ], function (err, res) {
      if (err) return callback (err);
      if (res.length == 0) return callback (null, 0);
      callback (null, res[0].v);
    });
  }
    
    
  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
    this.totalSize (callback);
  }

    /*
  size (callback) {
      var q = {
        mature : {$lte : Queue.now ()}
      };
      
      var opts = {};
      
      this._col.count (q, opts, callback);
    }
    */
    
  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
    var q = {
      mature : {$gt : Queue.now ()}
    };
      
    var opts = {};
      
    this._col.count (q, opts, callback);
  }
  
    
  /////////////////////////////////////////
  // get element from queue
  next_t (callback) {
    var self = this;
    this._col.find ({}).limit(1).sort ({mature:1}).project ({mature:1}).next (function (err, result) {
      if (err) return callback (err);
      callback (null, result && result.mature);
    });
  }  


  /////////////////////////////////////////
  _drain_read (cb) {
    debug ('drain_read called');

    this._read_bucket._cancel_flush_state_changes ();
    this._read_bucket._flush_state_changes ((err) => {
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
      (cb) => {this._in_drain = true; cb ();},
      (cb) => async.parallel ([
        (cb) => this._drain_read (cb),
        (cb) => this._drain_insert (cb),
      ], cb),
      (cb) => {debug ('drain stages completed'), cb ()},
      (cb) => {this._in_drain = false; this._drained = true; cb ()},
      (cb) => {this.cancel (); cb ()},
      (cb) => {debug ('drain completed'), cb ()}
    ], callback);
  }


  /////////////////////////////////////////
  _ensureIndexes (cb) {
    this._col.ensureIndex ({mature : 1}, function (err) {
      return cb (err);
    });
  }


  /////////////////////////////////////////
  _set_periodic_flush () {
  /////////////////////////////////////////
    var self = this;

    if (this._flush_timer) return;

    this._flush_timer = setTimeout (function () {
      self._flush_timer = null;

      debug ('flush_timer went off');

      if (self._insert_bucket.b.length) {
        self._flush_bucket (function (err, res) {
          if (err) {
            // keep retrying
            self._set_periodic_flush ();
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

    this._col.insertOne (bucket, {}, function (err, result) {
      if (err) {
        return callback (err);
      }
  
      callback (null, bucket);
    });
  }


  /////////////////////////////////////////
  // get element from queue
  _get_bucket (callback) {
  /////////////////////////////////////////
    debug ('need to read a bucket');
    
    this._col.findOneAndDelete ({}, {sort: {_id : 1}}, function (err, result) {
      if (err) {
        return callback (err);
      }
        
      var val = result && result.value;

      if (val) {
        debug ('read a bucket %s with %d elems', val._id.toString(), val.n);
      }

      callback (null, val);
    });
  }
};


class Factory extends QFactory {
  constructor (opts, mongo_conn) {
    super (opts);
    this._mongo_conn = mongo_conn;
  }

  queue (name, opts) {
    var full_opts = {}
    _.merge(full_opts, this._opts, opts);
    return new BucketMongoSafeQueue (name, this, full_opts);
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
    
  MongoClient.connect (m_url, function (err, db) {
    if (err) return cb (err);
    var F = new Factory (_opts, db);
    F.async_init ((err) => cb (null, F));
  });
}

module.exports = creator;





