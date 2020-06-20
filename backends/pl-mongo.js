const _ =     require ('lodash');
const async = require ('async');
const yaml =  require ('js-yaml');

var MongoClient = require ('mongodb').MongoClient;
var mongo =       require ('mongodb');

var Queue =                     require ('../Queue');
var QFactory_MongoDB_defaults = require ('../QFactory-MongoDB-defaults');

const DirectLink = require('../Pipeline/DirectLink');
const ChoiceLink = require('../Pipeline/ChoiceLink');
const Sink = require('../Pipeline/Sink');

const debug = require('debug')('keuss:Pipeline:Main');

class PipelinedMongoQueue extends Queue {

  //////////////////////////////////////////////
  constructor (name, pipeline, opts, orig_opts) {
    super (name, pipeline._factory, opts, orig_opts);

    this._pipeline = pipeline;
    this._col = this._pipeline._col;
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
    var q =  {
      _id: id,
      _q: this._name,
      reserved: {$exists: true}
    };

    var upd = {
      $set:   {
        mature: opts.mature || Queue.now (),
        tries:  opts.tries || 0,
        _q:     next_queue.name ()
      },
      $unset: {reserved: ''}
    };

    if (opts.payload) {
      upd.$set.payload = opts.payload;
    }
    else if (opts.update) {
      this._embed_update_for_payload (upd, opts.update);
    }

    this._col.updateOne (q, upd, {}, (err, result) => {
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
  _embed_update_for_payload (dst, src) {
    _.each (src, (v, k) => {
      if (k.startsWith ('$')) {
        _.each (v, (fv, fk) => {
          if (!dst[k]) dst[k] = {};
          dst[k]['payload.' + fk] = fv;
        });
      }
      else {
        dst['payload.' + k] = v;
      }
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

    this._queues = {};
    this._processors = {};
  }

  name ()       {return this._name;}
  queues ()     {return this._queues;}
  processors () {return this._processors;}


  //////////////////////////////////////////////////////////////////
  queue (name, opts, orig_opts) {
    if (this._queues[name]) {
      debug ('returning existing queue [%s]', name);
      return this._queues[name];
    }

    const q = new PipelinedMongoQueue (name, this, opts, orig_opts);
    debug ('created queue [%s]', name);
    this._queues[name] = q;
    return q;
  }


  //////////////////////////////////////////////////////////////////
  start () {
    _.each (this._processors, (v, k) => v.start ());
  }


  //////////////////////////////////////////////////////////////////
  stop () {
    _.each (this._processors, (v, k) => v.stop ());
  }


  //////////////////////////////////////////////////////////////////
  _to_yaml () {
    let obj = {
      name: this.name (),
      factory: this._factory.to_yaml_obj (),
      queues: {},
      processors: {}
    };

    _.each (this._queues, (v,k) => {
      obj.queues[k] = {
        type: v.type(),
        opts: v._orig_opts
      }
    });

    _.each (this._processors, (v,k) => obj.processors[k] = v.to_yaml_obj ());

    return yaml.dump (obj);
  }


  //////////////////////////////////////////////////////////////////
  _add_processor (pr) {
    this._processors [pr.name ()] = pr;
    debug ('added processor [%s] to pipeline [%s]', pr.name (), this.name ());
  }


  //////////////////////////////////////////////////////////////////
  // create needed indexes for O(1) functioning
  ensureIndexes (cb) {
    this._col.createIndex ({_q : 1, mature : 1}, err => cb (err));
  }
}


class PipelineBuilder {
  constructor (factory) {
    this._factory = factory;
    this._tasks = [];
    this._state = {};
  }

  pipeline (name) {
    // TODO close pipeline if present
    this._tasks.push (
      cb => {
        debug ('pipelinebuilder: new pipeline %s', name);
        this._state.pipeline = this._factory.pipeline (name);
        cb ();
      }
    );

    return this;
  }

  queue (name, opts) {
    this._tasks.push (
      cb => {
        if (!this._state.pipeline) return cb (`when creating queue ${name}: no pipeline. You need to call pipeline() first`);
        debug ('pipelinebuilder[%s]: new queue %s', this._state.pipeline.name (), name);
        this._factory._queue_from_pipeline (name, this._state.pipeline, opts);
        cb ();
      }
    );

    return this;
  }

  directLink (src, dst, func, opts) {
    this._tasks.push (
      cb => {
        if (!this._state.pipeline) return cb (`when creating DirectLink: no pipeline. You need to call pipeline() first`);

        const src_q = this._state.pipeline.queues()[src];
        const dst_q = this._state.pipeline.queues()[dst];

        try {
          const pr = new DirectLink (src_q, dst_q, opts);
          pr.on_data (func);
          debug ('pipelinebuilder[%s]: new DirectLink %s', this._state.pipeline.name (), pr.name ());
          cb ();
        }
        catch (e) {
          cb (e);
        }
      }
    );

    return this;
  }

  choiceLink (src, dst, func, opts) {
    this._tasks.push (
      cb => {
        if (!this._state.pipeline) return cb (`when creating ChoiceLink: no pipeline. You need to call pipeline() first`);
        const src_q = this._state.pipeline.queues()[src];
        const dst_q = dst.map (q => this._state.pipeline.queues()[q]);

        try {
          const pr = new ChoiceLink (src_q, dst_q, opts);
          pr.on_data (func);
          debug ('pipelinebuilder[%s]: new ChoiceLink %s', this._state.pipeline.name (), pr.name ());
          cb ();
        }
        catch (e) {
          cb (e);
        }
      }
    );

    return this;
  }

  sink (src, func, opts) {
    this._tasks.push (
      cb => {
        if (!this._state.pipeline) return cb (`when creating Sink: no pipeline. You need to call pipeline() first`);
        const src_q = this._state.pipeline.queues()[src];

        try {
          const pr = new Sink (src_q, opts);
          pr.on_data (func);
          debug ('pipelinebuilder[%s]: new Sink %s', this._state.pipeline.name (), pr.name ());
          cb ();
        }
        catch (e) {
          cb (e);
        }
      }
    );

    return this;
  }

  done (cb) {
    async.series (this._tasks, err => {
      if (err) {
        debug ('pipelinebuilder[%s]: error on creation, resetting state: ', (this._state.pipeline ? this._state.pipeline.name () : '-'), err);
      }
      else {
        debug ('pipelinebuilder[%s]: created, resetting state', this._state.pipeline.name ());
      }

      const pl = this._state.pipeline;

      this._state = {};
      this._tasks = [];
      cb (err, pl);
    });
  }
}


class Factory extends QFactory_MongoDB_defaults {
  constructor (opts, mongo_data_conn, mongo_topology_conn) {
    super (opts);
    this._mongo_data_conn = mongo_data_conn;
    this._mongo_topology_conn = mongo_topology_conn;
    this._db = mongo_data_conn.db();
    this._topology_db = mongo_topology_conn.db();
    this._pipelines = {};

    this._topology_db.collection ('factory').updateOne ({
      _id: this._name
    }, {
      $set: {
        opts: opts
      }
    }, {
      upsert: true
    });
  }


  builder () {
    return new PipelineBuilder (this);
  }


  pipeline (name) {
    if (this._pipelines[name]) {
      debug ('returning existing pipeline [%s]', name);
      return this._pipelines[name];
    }

    const pl = new Pipeline (name, this);
    debug ('created pipeline [%s]', name);
    this._pipelines[name] = pl;
    return pl;
  }


  queue (name, opts) {
    if (!opts) opts = {};

    var pl_name = opts.pipeline || 'default';
    var pipeline = this._pipelines[pl_name];

    if (!pipeline) {
      this._pipelines[pl_name] = new Pipeline (pl_name, this);
      pipeline = this._pipelines[pl_name];
    }

    return this._queue_from_pipeline (name, pipeline, opts);
  }


  close (cb) {
    super.close (() => {
      async.parallel ([
        cb => this._mongo_data_conn.close (cb),
        cb => this._mongo_topology_conn.close (cb)
      ], err => {
        this._mongo_data_conn = null;
        this._mongo_topology_conn = null;
        if (cb) return cb (err);
      });
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


  _queue_from_pipeline (name, pipeline, opts) {
    if (!opts) opts = {};

    var full_opts = {};
    _.merge(full_opts, this._opts, opts);
    return pipeline.queue (name, full_opts, opts);
  }
}


function creator (opts, cb) {
  const _opts = opts || {};
  const m_url = _opts.url || 'mongodb://localhost:27017/keuss';
  let   m_topology_url = _opts.topology_url;

  if (!m_topology_url) {
    let arr = m_url.split ('?');
    arr[0] += '_status';
    m_topology_url = arr.join ('?');
  }

  async.series ([
    cb => MongoClient.connect (m_url, { useNewUrlParser: true }, (err, cl) => {
      if (err) {
        debug ('error while connecting to data mongoDB [%s]', m_url, err);
        return cb (err);
      }

      debug ('connected OK to data mongoDB %s', m_url);
      cb (null, cl);
    }),
    cb => MongoClient.connect (m_topology_url, { useNewUrlParser: true }, (err, cl) => {
      if (err) {
        debug ('error while connecting to topology mongoDB [%s]', m_topology_url, err);
        return cb (err);
      }

      debug ('connected OK to topology mongoDB %s', m_topology_url);
      cb (null, cl);
    }),
  ], (err, res) => {
    if (err) return cb (err);

    var F = new Factory (_opts, res[0], res[1]);
    F.async_init (err => cb (null, F));
  });
}

module.exports = creator;
