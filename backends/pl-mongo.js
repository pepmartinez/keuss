'use strict';

var async = require ('async');
var _ =     require ('lodash');

var MongoClient = require ('mongodb').MongoClient;
var mongo =       require ('mongodb');

var Queue = require ('../Queue');
var QFactory =   require ('../QFactory');


class PipelinedMongoQueue extends Queue {
  
  //////////////////////////////////////////////
  constructor (name, pipeline, opts) {
  //////////////////////////////////////////////
    super (name, pipeline._factory, opts);

    this._pipeline = pipeline;
    this._col = this._pipeline._col;
  }
  
  /////////////////////////////////////////
  pipeline () {
  /////////////////////////////////////////
    return this._pipeline;
  }

  /////////////////////////////////////////
  static Type () {
  /////////////////////////////////////////
    return 'mongo:pipeline';
  }

  /////////////////////////////////////////
  type () {
  /////////////////////////////////////////
    return 'mongo:pipeline';
  }
  
  /////////////////////////////////////////
  // add element to queue
  insert (entry, callback) {
  /////////////////////////////////////////
    var self = this;
    entry._q = this._name;

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
    this._col.findOneAndDelete ({_q: this._name, mature: {$lte: Queue.nowPlusSecs (0)}}, {sort: {mature : 1}}, function (err, result) {
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
      _q:     this._name,
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
        _q: this._name,
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
        _q: this._name,
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
  // passes element to the next queue in pipeline
  pl_step (id, next_queue, opts, callback) {
    var self = this;

    var query =  {
      _id: id, 
      _q: this._name,
      reserved: {$exists: true}
    };

    var update = {
      $set:   {
        mature: opts.mature || Queue.now (),
        tries:  opts.tries || 0,
        _q:     next_queue.name ()
      }, 
      $unset: {reserved: ''}
    };

    if (opts.payload) update.$set.payload = opts.payload;

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
    var q = {_q: this._name};
    var opts = {};
    this._col.count (q, opts, callback);
  }
  
  
  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
  //////////////////////////////////
    var q = {
      _q: this._name,
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
      _q: this._name,
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
    this._col.find ({_q: this._name}).limit(1).sort ({mature:1}).project ({mature:1}).next (function (err, result) {
      if (err) {
        return callback (err);
      }
      
      callback (null, result && result.mature);
    });
  }
};



class Pipeline {
  constructor (name, factory) {
    this._name = name;
    this._factory = factory;
    this._col = factory._mongo_conn.collection (this._name);
    this.ensureIndexes (function (err) {});
  }

  name () {
    return this._name;
  }

  queue (name, opts) {
    return new PipelinedMongoQueue (name, this, opts);
  }

  list (cb) {
    // TODO
    this._mongo_conn.collections (function (err, collections) {
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

  ///////////////////////////////////////////////////////////////////////////////
  // private parts

  //////////////////////////////////////////////////////////////////
  // create needed indexes for O(1) functioning
  ensureIndexes (cb) {
  //////////////////////////////////////////////////////////////////
    this._col.ensureIndex ({_q : 1, mature : 1}, function (err) {
      return cb (err);
    })
  }
}


class Factory extends QFactory {
  constructor (opts, mongo_conn) {
    super (opts);
    this._mongo_conn = mongo_conn;
    this._pipelines = {};
  }
  
  queue (name, opts) {
    var pl_name = (opts && opts.pipeline) || 'default';
    
    var pipeline = this._pipelines[pl_name];
    if (!pipeline) {
      this._pipelines[pl_name] = new Pipeline (pl_name, this);
      pipeline = this._pipelines[pl_name];
    }

    var full_opts = {}
    _.merge(full_opts, this._opts, opts);
    return pipeline.queue (name, full_opts);
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
    return PipelinedMongoQueue.Type ();
  }
}

function creator (opts, cb) {
  var _opts = opts || {};
  var m_url = _opts.url || 'mongodb://localhost:27017/keuss';
    
  MongoClient.connect (m_url, function (err, db) {
    if (err) return cb (err);
    return cb (null, new Factory (_opts, db));
  });
}

module.exports = creator;
