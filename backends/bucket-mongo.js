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
    
    this._read_bucket = null;

    this._bucket_max_size = opts.bucket_max_size || 1024;
    this._bucket_max_wait = opts.bucket_max_wait || 500;
    this._set_periodic_flush ();

    console.log (`created BucketMongoQueue ${name}`);
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
    this._insert_bucket.b.push (entry);
    var id = this._insert_bucket._id.toString () + '--' + this._insert_bucket.b.length;
//    console.log (`added to bucket, ${id}`);

    if (this._insert_bucket.b.length >= this._bucket_max_size) {
      this._flush_bucket (callback);
    }
    else {
      setImmediate (function () {callback (null, id);}); 
    }
  }
  
  
  /////////////////////////////////////////
  // get element from queue
  get (callback) {
  /////////////////////////////////////////
    var self = this;

    if (this._read_bucket && this._read_bucket.b && this._read_bucket.b.length) {
      setImmediate (function () {
        var elem = self._read_bucket.b.shift ();
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
          setImmediate (function () {callback();});
        }
      });
    }
  }

  
  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback) {
  //////////////////////////////////
    var q = {};
    var opts = {};
    this._col.count (q, opts, callback);
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

    if (this._flush_timer) {
      clearTimeout (this._flush_timer);
      this._flush_timer = null;
    }

    this._flush_timer = setTimeout (function () {
      this._flush_timer = null;

//      console.log (`flush_timer went off`);

      if (self._insert_bucket.b.length) {
        self._flush_bucket (function (err, res) {
          self._set_periodic_flush ();
        });
      }
      else {
        // nothing to insert, just refire
        self._set_periodic_flush ();
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





