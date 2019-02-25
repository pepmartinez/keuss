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
};


class Bucket {
  constructor (bucket_in_db, opts) {
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
    };

    _.each (this._b, (e) => {
      if (e) {
        this._b_states.push (State.Available);
        this._b_counts.Available++;
      } 
      else {
        this._b_states.push (State.Committed);
        this._b_counts.Committed++;
      }
    });

    debug ('initialized Bucket, %O', this._b_counts);
  }

  id () {return this._id.toString();}
  exhausted () {return this._b_counts.Available == 0;}

  get_element () {
    for (var i = 0; i <  this._b_states.length; i++) {
      if (this._b_states[i] == State.Available) {
        var elem = this._b[i];
        this._b[i] = null;

        elem.tries = this._tries;
        elem.mature = this._mature;

        this._b_states[i] = State.Committed;
        this._b_counts.Committed++;
        this._b_counts.Available--;
        
        debug ('Bucket:got_element: got an available elem at pos %d, states are %o (%o)', i, this._b_states, this._b_counts);
        return elem;
      }
    }

    debug ('Bucket:got_element: got no available elem after iterating %d states -> %o', i, this._b_states);
    return null;
  } 

}


class BucketSet {
  constructor (col, opts) {
    this._opts = opts;
    this._col = col;
    this._reserve_delay = this._opts.reserve_delay || 30;

    this._buckets = {

    };

    this._active_bucket = null;
  }


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
        var bcket = new Bucket (val, this._opts);
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


  get_element (cb) {
    if (!this._active_bucket) {
      return this._read_bucket ((err, active_bucket) => {
        if (err) return cb (err);          // error
        if (!active_bucket) return cb ();  // coll empty or not mature

        // we got a bucket
        this.get_element (cb);
      }); 
    }
    else {
      var elem = this._active_bucket.get_element ();
      debug ('BucketSet:getElement: returning element %o', elem);
      setImmediate (() => cb (null, elem));
    }
  }


  reserve_element (cb) {}
  commit_element (cb) {}
  rollback_element (cb) {}


}












class BucketMongoSafeQueue extends Queue {
  
  //////////////////////////////////////////////
  constructor (name, factory, opts) {
  //////////////////////////////////////////////
    super (name, factory, opts);

    this._factory = factory;
    this._col = factory._mongo_conn.collection (name);

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
  /////////////////////////////////////////
    if (this._in_drain) {
      if (this._read_bucket.b.length == 0) {
        debug ('in_drain_read: read_buffer empty, calling _drain_read_cb');
        this._drain_read_cb ();
        this._drain_read_cb = undefined;
        return setImmediate (function () {callback (null,  null);});
      }
      else {
        debug ('in_drain_read: %d pending in read_buffer', this._read_bucket.b.length);
      }
    }


    this._read_bucket.get_element ((err, elem) => {
      if (err) return callback (err);
      callback (null, elem);
    });
  }


  reserve (callback) {callback (null, {mature: 0, payload: null, tries: 0}, null);}
  

  commit (id, callback) {callback (null, false);}
  

  rollback (id, next_t, callback) {callback (null, false);}





  /////////////////////////////////////////
  _drain_read (cb) {
    if (this._read_bucket.b.length == 0) {
      debug ('no read_buffer, drain_read done');
      cb ();
    }
    else {
      debug ('drain_read: %d pending in bucket, %d consumers. Setting cb for later', this._read_bucket.b.length, this.nConsumers ());
      this._drain_read_cb = cb;
    }
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
//        (cb) => this._drain_read (cb),
        (cb) => this._drain_insert (cb),
      ], cb),
      (cb) => {debug ('drain stages completed'), cb ()},
      (cb) => {this._in_drain = false; this._drained = true; cb ()},
      (cb) => {this.cancel (); cb ()},
      (cb) => {debug ('drain completed'), cb ()}
    ], callback);
  }


  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback) {
  //////////////////////////////////
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
  //////////////////////////////////
    this.totalSize (callback);
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





