'use strict';

var async = require ('async');
var _ =     require ('lodash');

var MongoClient = require ('mongodb').MongoClient;
var mongo =       require ('mongodb');

var AsyncQueue = require ('../AsyncQueue');
var Queue =      require ('../Queue');


//////////////////////////////////////////////////////////////////
// static data
var _s_mongo_conn = null;
var _s_opts = null;


class SimpleMongoQueue extends AsyncQueue {
  
  //////////////////////////////////////////////
  constructor (name, opts) {
  //////////////////////////////////////////////
    if (!_s_mongo_conn) {
      throw new Error ('MongoDB not initialized, call init()');
    }
    
    super (name, opts);
    
    this._col = _s_mongo_conn.collection (name);
    this.ensureIndexes (function (err) {});
  }
  
  
  /////////////////////////////////////////
  static Type () {
  /////////////////////////////////////////
    return 'mongo:simple';
  }

  /////////////////////////////////////////
  type () {
  /////////////////////////////////////////
    return 'mongo:simple';
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
      
      self._verbose  ('insert: inserted payload %j', entry, {})
        
      // TODO result.insertedCount must be 1

      callback (null, result.insertedId);
    });
  }
  
  
  /////////////////////////////////////////
  // get element from queue
  get (callback) {
  /////////////////////////////////////////
    var self = this;
    this._col.findOneAndDelete ({}, {sort: {mature : 1}}, function (err, result) {
      if (err) {
        return callback (err);
      }
      
      self._verbose  ('get: obtained %j', result, {});
      callback (null, result && result.value);
    });
  }
  
  
  //////////////////////////////////
  // reserve element: call cb (err, pl) where pl has an id
  reserve (callback) {
    var self = this;
    
    var delay = this._opts.reserve_delay || 120;
    
    var update = {
      $set: {mature: Queue.nowPlusSecs (delay), reserved: new Date ()},
      $inc: {tries: 1}
    };
    
    var opts = {
      sort: {mature : 1}, 
      returnOriginal: true
    };
    
    this._col.findOneAndUpdate ({}, update, opts, function (err, result) {
      if (err) {
        return callback (err);
      }
      
      self._verbose  ('reserve: obtained %j', result, {});
      callback (null, result && result.value);
    });
  }
  
  
  //////////////////////////////////
  // commit previous reserve, by p.id
  commit (id, callback) {
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
    
    this._col.deleteOne (query, {}, function (err, result) {
      if (err) {
        return callback (err);
      }
      
      self._verbose  ('commit (%s): res is %j', id, result, {});
      callback (null, result && (result.deletedCount == 1));
    });
  }
  
  
  //////////////////////////////////
  // rollback previous reserve, by p.id
  rollback (id, callback) {
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
      $set:   {mature: Queue.now ()}, 
      $unset: {reserved: ''}
    };

    this._col.updateOne (query, update, {}, function (err, result) {
      if (err) {
        return callback (err);
      }
      self._verbose ('rollback (%s): res is %j', id, result, {});
      callback (null, result && (result.modifiedCount == 1));
    });
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
    var q = {
      mature : {$lte : AsyncQueue.now ()}
    };
    
    var opts = {};
    
    this._col.count (q, opts, callback);
  }
  
  
  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
  //////////////////////////////////
    var q = {
      mature : {$gt : AsyncQueue.now ()}
    };
    
    var opts = {};
    
    this._col.count (q, opts, callback);
  }

  
  /////////////////////////////////////////
  // get element from queue
  next_t (callback) {
  /////////////////////////////////////////
    var self = this;
    this._col.find ({}).limit(1).sort ({mature:1}).project ({mature:1}).next (function (err, result) {
      if (err) {
        return callback (err);
      }
      
      self._verbose  ('next_t: obtained %j', result, {});
      callback (null, result && result.mature);
    });
  }
  
  
  ///////////////////////////////////////////////////////////////////////////////
  // private parts

  //////////////////////////////////////////////////////////////////
  // create needed indexes for O(1) functioning
  ensureIndexes (cb) {
  //////////////////////////////////////////////////////////////////
    this._col.ensureIndex ({mature : 1}, function (err) {
      return cb (err);
    })
  }
  
  
  ////////////////////////////////////////////////////////////////////////////////
  // statics
  
  //////////////////////////////////////////////////////////////////
  static init (opts, cb) {
  //////////////////////////////////////////////////////////////////
    _s_opts = opts;
    if (!_s_opts) _s_opts = {};
    var m_url = _s_opts.url || 'mongodb://localhost:27017/keuss';
    
    MongoClient.connect (m_url, function (err, db) {
      _s_mongo_conn = db;
      cb (err);
    });
  }
  
  
  //////////////////////////////////////////////////////////////////
  static end (cb) {
  //////////////////////////////////////////////////////////////////
    if (_s_mongo_conn) {
      _s_mongo_conn.close ();
      _s_mongo_conn = null;
    } 
    
    if (cb) {
      return cb ();
    }
  }
  
  //////////////////////////////////////////////////////////////////
  static list (cb) {
  //////////////////////////////////////////////////////////////////
    _s_mongo_conn.collections (function (err, collections) {
      if (err) {
        return cb (err);
      }
      
      var colls = [];
      
      collections.forEach (function (coll) {
        colls.push (coll.s.name)
      });
      
      cb (null, colls);
    });
  }
};


module.exports = SimpleMongoQueue;





