var _ = require ('lodash');

var MongoClient = require ('mongodb').MongoClient;
var mongo =       require ('mongodb');

var Queue =                     require ('../Queue');
var QFactory_MongoDB_defaults = require ('../QFactory-MongoDB-defaults');

class SimpleMongoQueue extends Queue {

  //////////////////////////////////////////////
  constructor (name, factory, opts, orig_opts) {
    super (name, factory, opts, orig_opts);
    this._col = factory._db.collection (name);
  }


  /////////////////////////////////////////
  static Type () {
    return 'mongo:simple';
  }

  /////////////////////////////////////////
  type () {
    return 'mongo:simple';
  }

  /////////////////////////////////////////
  // add element to queue
  insert (entry, callback) {
    this._col.insertOne (entry, {}, (err, result) => {
      if (err) return callback (err);
      callback (null, result.insertedId);
    });
  }


  /////////////////////////////////////////
  // get element from queue
  get (callback) {
    this._col.findOneAndDelete ({mature: {$lte: Queue.nowPlusSecs (0)}}, {sort: {mature : 1}}, (err, result) => {
      if (err) return callback (err);
      const v = result && result.value;
      if (!v) return callback ();
      if (v.payload._bsontype == 'Binary') v.payload = v.payload.buffer;
      callback (null, v);
    });
  }


  //////////////////////////////////
  // reserve element: call cb (err, pl) where pl has an id
  reserve (callback) {
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
      returnDocument: 'before'
    };

    this._col.findOneAndUpdate (query, update, opts, (err, result) => {
      if (err) return callback (err);
      const v = result && result.value;
      if (!v) return callback ();
      if (v.payload._bsontype == 'Binary') v.payload = v.payload.buffer;
      callback (null, v);
    });
  }


  //////////////////////////////////
  // commit previous reserve, by p.id
  commit (id, callback) {
    try {
      var query =  {
        _id: (_.isString(id) ? new mongo.ObjectID (id) : id),
        reserved: {$exists: true}
      };
    }
    catch (e) {
      return callback ('id [' + id + '] can not be used as rollback id: ' + e);
    }

    this._col.deleteOne (query, {}, (err, result) => {
      if (err) return callback (err);
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

    this._col.updateOne (query, update, {}, (err, result) => {
      if (err) return callback (err);
      callback (null, result && (result.modifiedCount == 1));
    });
  }


  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback) {
    var q = {};
    var opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
    var q = {
      mature : {$lte : Queue.now ()}
    };

    var opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
    var q = {
      mature : {$gt : Queue.now ()},
      reserved: {$exists: false}
    };

    var opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////
  // queue size of reserved elements only
  resvSize (callback) {
    var q = {
      mature : {$gt : Queue.now ()},
      reserved: {$exists: true}
    };

    var opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  /////////////////////////////////////////
  // get element from queue
  next_t (callback) {
    this._col.find ({}).limit(1).sort ({mature:1}).project ({mature:1}).next ((err, result) => {
      if (err) return callback (err);
      callback (null, result && result.mature);
    });
  }


  //////////////////////////////////////////////
  // remove by id
  remove (id, callback) {
    try {
      var query =  {
        _id: (_.isString(id) ? new mongo.ObjectID (id) : id),
        reserved: {$exists: false}
      };
    }
    catch (e) {
      return callback ('id [' + id + '] can not be used as remove id: ' + e);
    }

    this._col.deleteOne (query, {}, (err, result) => {
      if (err) return callback (err);
      callback (null, result && (result.deletedCount == 1));
    });
  }


  ///////////////////////////////////////////////////////////////////////////////
  // private parts

  //////////////////////////////////////////////////////////////////
  // create needed indexes for O(1) functioning
  _ensureIndexes (cb) {
    this._col.createIndex ({mature : 1}, err => cb (err, this));
  }
};


class Factory extends QFactory_MongoDB_defaults {
  constructor (opts, mongo_conn) {
    super (opts);
    this._mongo_conn = mongo_conn;
    this._db = mongo_conn.db();
  }

  queue (name, opts, cb) {
    if (!cb) {
      cb = opts;
      opts = {};
    }

    const full_opts = {};
    _.merge(full_opts, this._opts, opts);
    
    const q = new SimpleMongoQueue (name, this, full_opts, opts);
    q._ensureIndexes (cb);
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
      pipeline: false,
      tape:     false,
      remove:   true
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





