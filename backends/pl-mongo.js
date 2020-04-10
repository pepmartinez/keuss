var async = require ('async');
var _ =     require ('lodash');

var MongoClient = require ('mongodb').MongoClient;
var mongo =       require ('mongodb');

var Queue =    require ('../Queue');
var QFactory = require ('../QFactory');


class PipelinedMongoQueue extends Queue {

  //////////////////////////////////////////////
  constructor (name, pipeline, opts) {
    super (name, pipeline._factory, opts);

    this._pipeline = pipeline;
    this._col = this._pipeline._col;

    // set topology
    this._stats.topology ({
      pipeline: pipeline.name()
    }, () => {});
  }

  /////////////////////////////////////////
  pipeline () {
    return this._pipeline;
  }

  /////////////////////////////////////////
  static Type () {
    return 'mongo:pipeline';
  }

  /////////////////////////////////////////
  type () {
    return 'mongo:pipeline';
  }

  /////////////////////////////////////////
  // add element to queue
  insert (entry, callback) {
    entry._q = this._name;

    this._col.insertOne (entry, {}, (err, result) => {
      if (err) return callback (err);
      // TODO result.insertedCount must be 1
      callback (null, result.insertedId);
    });
  }


  /////////////////////////////////////////
  // get element from queue
  get (callback) {
    this._col.findOneAndDelete ({_q: this._name, mature: {$lte: Queue.nowPlusSecs (0)}}, {sort: {mature : 1}}, (err, result) => {
      if (err) return callback (err);
      callback (null, result && result.value);
    });
  }


  //////////////////////////////////
  // reserve element: call cb (err, pl) where pl has an id
  reserve (callback) {
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

    this._col.findOneAndUpdate (query, update, opts, (err, result) => {
      if (err) return callback (err);
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
        _q: this._name,
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

    var query;

    try {
      query =  {
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

    this._col.updateOne (query, update, {}, (err, result) => {
      if (err) return callback (err);
      callback (null, result && (result.modifiedCount == 1));
    });
  }


  //////////////////////////////////
  // passes element to the next queue in pipeline
  pl_step (id, next_queue, opts, callback) {
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

    this._col.updateOne (query, update, {}, (err, result) => {
      if (err) return callback (err);
      callback (null, result && (result.modifiedCount == 1));
    });
  }


  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback) {
    var q = {_q: this._name};
    var opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
    var q = {
      _q: this._name,
      mature : {$lte : Queue.now ()}
    };

    var opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
    var q = {
      _q: this._name,
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
      _q: this._name,
      mature : {$gt : Queue.now ()},
      reserved: {$exists: true}
    };

    var opts = {};
    this._col.countDocuments (q, opts, callback);
  }


  /////////////////////////////////////////
  // get element from queue
  next_t (callback) {
    this._col.find ({_q: this._name}).limit(1).sort ({mature:1}).project ({mature:1}).next ((err, result) => {
      if (err) return callback (err);
      callback (null, result && result.mature);
    });
  }


  //////////////////////////////////////////////
  // redefnition
  _move_to_deadletter (obj, cb) {
    this.pl_step (obj._id, this._factory.deadletter_queue (), {}, (err, res) => {
      if (err) return cb (err);
      this._stats.incr ('get');
      this._factory.deadletter_queue ()._stats.incr ('put');
      this._factory.deadletter_queue ()._signaller.signalInsertion (Queue.now());

      cb (null, false);
    });
  }
}



class Pipeline {
  constructor (name, factory) {
    this._name = name;
    this._factory = factory;
    this._col = factory._db.collection (this._name);
    this.ensureIndexes (err => {});
  }

  name () {
    return this._name;
  }

  queue (name, opts) {
    return new PipelinedMongoQueue (name, this, opts);
  }

  list (cb) {
    // TODO
    cb (null, []);
  }

  ///////////////////////////////////////////////////////////////////////////////
  // private parts

  //////////////////////////////////////////////////////////////////
  // create needed indexes for O(1) functioning
  ensureIndexes (cb) {
    this._col.createIndex ({_q : 1, mature : 1}, err => cb (err));
  }
}


class Factory extends QFactory {
  constructor (opts, mongo_conn) {
    super (opts);
    this._mongo_conn = mongo_conn;
    this._db = mongo_conn.db();
    this._pipelines = {};
  }

  queue (name, opts) {
    if (!opts) opts = {};
    if (!opts.pipeline) opts.pipeline = 'default';

    var pl_name = opts.pipeline;
    var pipeline = this._pipelines[pl_name];

    if (!pipeline) {
      this._pipelines[pl_name] = new Pipeline (pl_name, this);
      pipeline = this._pipelines[pl_name];
    }

    var full_opts = {};
    _.merge(full_opts, this._opts, opts);
    return pipeline.queue (name, full_opts);
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
    return PipelinedMongoQueue.Type ();
  }

  capabilities () {
    return {
      sched:    true,
      reserve:  true,
      pipeline: true
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
