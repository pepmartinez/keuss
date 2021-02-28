var async =     require ('async');
var _ =         require ('lodash');
var AsyncLock = require ('async-lock');

var debug = require('debug')('keuss:backend:BucketMongo');

var MongoClient = require ('mongodb').MongoClient;
var mongo =       require ('mongodb');

var Queue =                     require ('../Queue');
var QFactory_MongoDB_defaults = require ('../QFactory-MongoDB-defaults');

class BucketMongoQueue extends Queue {

  //////////////////////////////////////////////
  constructor (name, factory, opts, orig_opts) {
  //////////////////////////////////////////////
    super (name, factory, opts, orig_opts);

    this._factory = factory;
    this._col = factory._db.collection (name);

    this._insert_bucket = {
      _id: new mongo.ObjectID (),
      b: []
    };

    this._read_bucket = {
      b: []
    }

    this._bucket_max_size = opts.bucket_max_size || 1024;
    this._bucket_max_wait = opts.bucket_max_wait || 500;

    this._lock = new AsyncLock ();

    debug ('created BucketMongoSafe %s', name);
  }


  /////////////////////////////////////////
  static Type () {
  /////////////////////////////////////////
    return 'mongo:bucket';
  }

  /////////////////////////////////////////
  type () {
  /////////////////////////////////////////
    return 'mongo:bucket';
  }

  /////////////////////////////////////////
  // add element to queue
  insert (entry, callback) {
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

      setImmediate (() => callback (null, id));
    }
  }


  /////////////////////////////////////////
  // get element from queue
  get (callback) {
    if (this._in_drain) {
      if (this._read_bucket.b.length == 0) {
        debug ('in_drain_read: read_buffer empty, calling _drain_read_cb');
        this._drain_read_cb ();
        this._drain_read_cb = undefined;
        return setImmediate (() => callback (null,  null));
      }
      else {
        debug ('in_drain_read: %d pending in read_buffer', this._read_bucket.b.length);
      }
    }

    debug ('_ensure_bucket: acquire lock');

    this._lock.acquire ('ensure-bucket', done => {
      debug ('_ensure_bucket: lock acquired');

      if (this._read_bucket.b.length) {
        debug ('_ensure_bucket: end (already present)');
        return done ();
      }

      this._get_bucket ((err, res) => {
        if (err) {
          debug ('_ensure_bucket: end (error) %o', err);
          return done (err);
        }

        if (!res) {
          debug ('_ensure_bucket: end (no bucket)');
          this._read_bucket = {b: []};
          return done ();
        }

        debug ('_ensure_bucket: end (bucket read)');
        this._read_bucket = res;
        done (null, res);
      });
    }, (err, ret) => {
      debug ('BucketSet:_ensure_bucket: lock released');
      if (err) return callback (err);

      if (this._read_bucket.b.length) {
        var elem = {payload: this._read_bucket.b.shift ()};
        if (elem.payload._bsontype == 'Binary') elem.payload = elem.payload.buffer;
        elem.tries = 0;
        elem.mature = this._read_bucket.mature;
        setImmediate (() => callback (null, elem));
      }
      else {
        setImmediate (callback);
      }
    });
  }


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


  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback) {
  //////////////////////////////////
    this._col.aggregate ([
      {$group:{_id:'t', v: {$sum: '$n'}}}
    ], (err, cursor) => {
      if (err) return callback (err);

      cursor.toArray ((err, res) => {
        if (err) return callback (err);
        if (res.length == 0) return callback (null, 0);
        callback (null, res[0].v);
      });
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
    return new BucketMongoQueue (name, this, full_opts, opts);
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
    return BucketMongoQueue.Type ();
  }

  capabilities () {
    return {
      sched:    false,
      reserve:  false,
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





