var async = require ('async');
var _ =     require ('lodash');

var MongoClient = require ('mongodb').MongoClient;
var mongo =       require ('mongodb');

var Queue =    require ('../Queue');
var QFactory = require ('../QFactory');

class SimpleMongoQueue extends Queue {
  
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

      // TODO result.insertedCount must be 1

      callback (null, result.insertedId);
    });
  }
  
  
  /////////////////////////////////////////
  // get element from queue
  get (callback) {
  /////////////////////////////////////////
    var self = this;
    this._col.findOneAndDelete ({mature: {$lte: Queue.nowPlusSecs (0)}}, {sort: {mature : 1}}, function (err, result) {
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
      
      callback (null, result && (result.deletedCount == 1));
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
    var q = {};
    var opts = {};
    this._col.count (q, opts, callback);
  }
  
  
  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
  //////////////////////////////////
    var q = {
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
      mature : {$gt : Queue.now ()}
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
};


class Factory extends QFactory {
  constructor (opts, mongo_conn) {
    super (opts);
    this._mongo_conn = mongo_conn;
  }

  queue (name, opts) {
    var full_opts = {}
    _.merge(full_opts, this._opts, opts);
    return new SimpleMongoQueue (name, this, full_opts);
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
    return SimpleMongoQueue.Type ();
  }

  capabilities () {
    return {
      sched:    true,
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





