'use strict';

var async = require ('async');
var _ =     require ('lodash');

var MongoClient = require ('mongodb').MongoClient;
var mongo =       require ('mongodb');

var Queue =    require ('../Queue');
var QFactory = require ('../QFactory');


class BucketMongoQueue extends Queue {
  
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
    
    this._read_bucket = {
      b: []
    }

    this._bucket_max_size = opts.bucket_max_size || 1024;
    this._bucket_max_wait = opts.bucket_max_wait || 500;

    this._in_drain = false;

//    console.log (`created BucketMongoQueue ${name}`);
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
  /////////////////////////////////////////
    if (this._in_drain) return setImmediate (function () {callback ('drain');});

    if (this._insert_bucket.b.length == 0) this._insert_bucket.mature = entry.mature;
    this._insert_bucket.b.push (entry.payload);
    var id = this._insert_bucket._id.toString () + '--' + this._insert_bucket.b.length;
//    console.log (`added to bucket, ${id}`);

    if (this._insert_bucket.b.length >= this._bucket_max_size) {
      if (this._flush_timer) clearTimeout (this._flush_timer);
      this._flush_timer = null;
  
//      console.log (`cancelled periodic_flush`);

      this._flush_bucket (callback);
    }
    else {
      if (this._insert_bucket.b.length == 1) {
//        console.log (`first insert of bucket, set periodic_flush`);
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
        console.log (`in_drain_read: read_buffer empty, calling _drain_read_cb`)
        this._drain_read_cb ();
        this._drain_read_cb = undefined;
        return setImmediate (function () {callback (null,  null);});
      }
      else {
        console.log (`in_drain_read: ${this._read_bucket.b.length} pending in read_buffer`)
      }
    }

    var self = this;

    if (this._read_bucket.b.length) {
      setImmediate (function () {
        var elem = self._read_bucket.b.shift ();
        elem.tries = 0;
        elem.mature = self._read_bucket.mature;
        callback (null, elem);
      });
    }
    else {
      this._get_bucket (function (err, res) {
        if (err) return callback (err);
        self._read_bucket = res;

        if (self._read_bucket) {
          var elem = self._read_bucket.b.shift ();
          callback (null, elem);
        }
        else {
          self._read_bucket = {b: []};
          setImmediate (function () {callback();});
        }
      });
    }
  }


  /////////////////////////////////////////
  _drain_read (cb) {
    if ((this.nConsumers () == 0) && (this._read_bucket.b.length == 0)) {
      console.log (`no consumers, no read_buffer, drain_read done`)
      cb ();
    }
    else {
      console.log (`drain_read: ${this._read_bucket.b.length} pending in bucket, ${this.nConsumers ()} consumers. Setting cb for later`)
      this._drain_read_cb = cb;
    }
  }


  /////////////////////////////////////////
  _drain_insert (cb) {
    console.log (`drain_insert called`);

    if (this._insert_bucket.b.length) {
      if (this._flush_timer) clearTimeout (this._flush_timer);
      this._flush_timer = null;
  
      console.log (`drain_insert flushing _insert_bucket`);

      this._flush_bucket (cb);
    }
    else {
      console.log (`drain_insert: nothing pending insertion, completed`);
      cb ();
    }
  }
  
  /////////////////////////////////////////
  // empty local buffers
  drain (callback) {
    async.series ([
      (cb) => {this._in_drain = true; cb ();},
      (cb) => {this.cancel (); cb ();},
      (cb) => async.parallel ([
        (cb) => this._drain_read (cb),
        (cb) => this._drain_insert (cb),
      ], cb),
      (cb) => {this.cancel (); cb ();},
      (cb) => {this._in_drain = false; cb ();},
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

//      console.log (`flush_timer went off`);

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

//    console.log (`_set_periodic_flush set, wait ${this._bucket_max_wait} msecs`);
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

    console.log (`flushing bucket ${bucket._id} with ${bucket.b.length} elems`)

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
    console.log (`need to read a bucket`)
    
    this._col.findOneAndDelete ({}, {sort: {_id : 1}}, function (err, result) {
      if (err) {
        return callback (err);
      }
        
      var val = result && result.value;

      if (val) {
        console.log (`read a bucket ${val._id.toString()} with ${val.n} elems`);
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
    return new BucketMongoQueue (name, this, full_opts);
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
    
  MongoClient.connect (m_url, function (err, db) {
    if (err) return cb (err);
    var F = new Factory (_opts, db);
    F.async_init ((err) => cb (null, F));
  });
}

module.exports = creator;





