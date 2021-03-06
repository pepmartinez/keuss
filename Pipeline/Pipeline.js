const _ =  require ('lodash');

const PipelinedMongoQueue = require ('./Queue');

const debug = require('debug')('keuss:Pipeline:Pipeline');

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

module.exports = Pipeline;
