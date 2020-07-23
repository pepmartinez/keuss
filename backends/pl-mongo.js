const _ =     require ('lodash');
const async = require ('async');
const vm =    require ('vm');

const MongoClient = require ('mongodb').MongoClient;

const QFactory_MongoDB_defaults = require ('../QFactory-MongoDB-defaults');

const PipelineBuilder =     require ('../Pipeline/Builder');
const Pipeline =            require ('../Pipeline/Pipeline');
const PipelinedMongoQueue = require ('../Pipeline/Queue');

const debug = require('debug')('keuss:Pipeline:Main');


///////////////////////////////////////////////////////////
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


  ///////////////////////////////////////////////////////////
  builder () {
    return new PipelineBuilder (this);
  }


  ///////////////////////////////////////////////////////////
  pipelineFromRecipe (name, bs_src_array, setup_src_array, opts, cb) {
    const context = {
      Buffer,
      clearImmediate,
      clearInterval,
      clearTimeout,
      require,
      setImmediate,
      setTimeout,
      setInterval,
      TextEncoder,
      TextDecoder,
      URL,
      URLSearchParams,
      builder: this.builder ().pipeline (name),
      done: cb
    };

    if (opts && opts.context) _.assign (context, opts.context);

    vm.createContext (context);

    try {
      _.each (bs_src_array, (elem, idx) => {
        const src = elem.src || elem;
        const sname = elem.name || `bootstrap[${idx}]`;

        debug ('Loading BS script %s', sname);
        const script = new vm.Script (src, {filename: sname});
        script.runInContext (context);
        debug ('BS script %s loaded', sname);
      });

      _.each (setup_src_array, (elem, idx) => {
        const src = elem.src || elem;
        const sname = elem.name || `setup[${idx}]`;

        debug ('Loading Setup script %s', sname);
        const script = new vm.Script (src, {filename: sname});
        script.runInContext (context);
        debug ('Setup script %s loaded', sname);
      });
    }
    catch (err) {
      return cb (err);
    }

    this._topology_db.collection ('pipelines').updateOne ({
      _id: name
    }, {
      $set: {
        bs: bs_src_array,
        setup: setup_src_array
      }
    }, {
      upsert: true
    });


  }


  ///////////////////////////////////////////////////////////
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


  ///////////////////////////////////////////////////////////
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


  ///////////////////////////////////////////////////////////
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


  ///////////////////////////////////////////////////////////
  type () {
    return PipelinedMongoQueue.Type ();
  }


  ///////////////////////////////////////////////////////////
  capabilities () {
    return {
      sched:    true,
      reserve:  true,
      pipeline: true
    };
  }


  ///////////////////////////////////////////////////////////
  _queue_from_pipeline (name, pipeline, opts) {
    if (!opts) opts = {};

    var full_opts = {};
    _.merge(full_opts, this._opts, opts);
    return pipeline.queue (name, full_opts, opts);
  }
}


///////////////////////////////////////////////////////////
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
