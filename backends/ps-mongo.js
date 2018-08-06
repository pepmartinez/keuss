'use strict';

var async = require ('async');
var _ =     require ('lodash');

var MongoClient = require ('mongodb').MongoClient;
var mongo =       require ('mongodb');

var Queue =       require ('../Queue');
var QFactory =    require ('../QFactory');

class PersistentMongoQueue extends Queue {
  
  //////////////////////////////////////////////
  constructor (name, factory, opts) {
  //////////////////////////////////////////////
    super (name, factory, opts);

    this._factory = factory;
    this._col = factory._mongo_conn.collection (name);
    this.ensureIndexes (function (err) {});
  }
  
  
  /////////////////////////////////////////
  static Type () {
  /////////////////////////////////////////
    return 'mongo:persistent';
  }

  /////////////////////////////////////////
  type () {
  /////////////////////////////////////////
    return 'mongo:persistent';
  }
  
  /////////////////////////////////////////
  // add element to queue
  insert (entry, callback) {
  /////////////////////////////////////////
    var self = this;
    this._col.insertOne (entry, {}, function (err, result) {
      if (err) {
        return callback (err);
      }

      // TODO result.insertedCount must be 1

      callback (null, result.insertedId);
    });
  }
  
  
  /////////////////////////////////////////
  // get element from queue
  get (callback) {
  /////////////////////////////////////////
    var q = {
      mature: {$lte: Queue.nowPlusSecs (0)},
      processed: {$exists: false}
    };

    var updt = {
      $set: {processed: new Date ()}
    };

    var opts = {
      sort: {mature : 1}
    };

    this._col.findOneAndUpdate (q, updt, opts, function (err, result) {
      if (err) {
        return callback (err);
      }
      
      callback (null, result && result.value);
    });
  }
  
  
  //////////////////////////////////
  // reserve element: call cb (err, pl) where pl has an id
  reserve (callback) {
    var self = this;
    
    var delay = this._opts.reserve_delay || 120;
    
    var query = {
      processed: {$exists: false},
      mature: {$lte: Queue.nowPlusSecs (0)}
    };

    var update = {
      $set: {mature: Queue.nowPlusSecs (delay), reserved: new Date ()},
      $inc: {tries: 1}
    };
    
    var opts = {
      sort: {mature : 1}, 
      returnOriginal: true
    };
    
    this._col.findOneAndUpdate (query, update, opts, function (err, result) {
      if (err) {
        return callback (err);
      }
      
      callback (null, result && result.value);
    });
  }
  
  
  //////////////////////////////////
  // commit previous reserve, by p.id
  commit (id, callback) {
    var query;

    try {
      query =  {
        _id: (_.isString(id) ? new mongo.ObjectID (id) : id), 
        reserved: {$exists: true}
      };
    }
    catch (e) {
      return callback ('id [' + id + '] can not be used as rollback id: ' + e);
    }

    var updt = {
      $set:   {processed: new Date ()},
      $unset: {reserved: ''}
    };

    var opts = {};

    this._col.updateOne (query, updt, opts, function (err, result) {
      if (err) {
        return callback (err);
      }
      
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

    var self = this;
    
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

    this._col.updateOne (query, update, {}, function (err, result) {
      if (err) {
        return callback (err);
      }
      
      callback (null, result && (result.modifiedCount == 1));
    });
  }
  
  
  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback) {
  //////////////////////////////////
    var q = {
      processed: {$exists: false}
    };
    
    var opts = {};
    
    this._col.count (q, opts, callback);
  }
  
  
  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
  //////////////////////////////////
    var q = {
      processed: {$exists: false},
      mature : {$lte : Queue.now ()}
    };
    
    var opts = {};
    
    this._col.count (q, opts, callback);
  }
  
  
  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
  //////////////////////////////////
    var q = {
      processed: {$exists: false},
      mature : {$gt : Queue.now ()}
    };
    
    var opts = {};
    
    this._col.count (q, opts, callback);
  }

  
  /////////////////////////////////////////
  // get element from queue
  next_t (callback) {
  /////////////////////////////////////////
    this._col
    .find ({processed: {$exists: false}})
    .limit(1)
    .sort ({mature:1})
    .project ({mature:1})
    .next (function (err, result) {
      if (err) {
        return callback (err);
      }
      
      callback (null, result && result.mature);
    });
  }
  
  
  ///////////////////////////////////////////////////////////////////////////////
  // private parts

  //////////////////////////////////////////////////////////////////
  // create needed indexes for O(1) functioning
  ensureIndexes (cb) {
  //////////////////////////////////////////////////////////////////
    this._col.ensureIndex ({mature : 1}, (err) => {
      if (err) return cb (err);

      this._col.createIndex({processed: 1}, {expireAfterSeconds: this._opts.ttl || 3600}, (err) => {
        cb (err);
      });
    })
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
    return new PersistentMongoQueue (name, this, full_opts);
  }

  close (cb) {
    if (this._mongo_conn) {
      this._mongo_conn.close ();
      this._mongo_conn = null;
    } 
    
    if (cb) {
      return cb ();
    }
  }
  
  type () {
    return PersistentMongoQueue.Type ();
  }

  capabilities () {
    return {
      sched:    true,
      reserve:  true,
      pipeline: false,
      tape:     true
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





