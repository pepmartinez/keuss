const async = require ('async');
const _ =     require ('lodash');

const DirectLink = require('../Pipeline/DirectLink');
const ChoiceLink = require('../Pipeline/ChoiceLink');
const Sink =       require('../Pipeline/Sink');

const debug = require('debug')('keuss:Pipeline:Builder');


///////////////////////////////////////////////////////////
class PipelineBuilder {
  constructor (factory) {
    this._factory = factory;
    this._tasks = [];
    this._state = {};
  }

  ///////////////////////////////////////////////////////////
  pipeline (name) {
    this._tasks.push (
      cb => {
        if (this._state.pipeline) return cb (`when creating pipeline ${name}: pipeline() called already`);
        debug ('new pipeline %s', name);
        this._state.pipeline = this._factory.pipeline (name);
        cb ();
      }
    );

    return this;
  }

  ///////////////////////////////////////////////////////////
  queue (name, opts) {
    this._tasks.push (
      cb => {
        if (!this._state.pipeline) return cb (`when creating queue ${name}: no pipeline. You need to call pipeline() first, and do no calls after done()`);
        debug ('[%s]: new queue %s', this._state.pipeline.name (), name);
        this._factory._queue_from_pipeline (name, this._state.pipeline, opts);
        cb ();
      }
    );

    return this;
  }

  ///////////////////////////////////////////////////////////
  directLink (src, dst, func, opts) {
    this._tasks.push (
      cb => {
        if (!this._state.pipeline) return cb (`when creating DirectLink: no pipeline. You need to call pipeline() first, and do no calls after done()`);

        const src_q = this._state.pipeline.queues()[src];
        const dst_q = this._state.pipeline.queues()[dst];

        try {
          const pr = new DirectLink (src_q, dst_q, opts);
          pr.on_data (func);
          debug ('[%s]: new DirectLink %s', this._state.pipeline.name (), pr.name ());
          cb ();
        }
        catch (e) {
          cb (e);
        }
      }
    );

    return this;
  }

  ///////////////////////////////////////////////////////////
  choiceLink (src, dst, func, opts) {
    this._tasks.push (
      cb => {
        if (!this._state.pipeline) return cb (`when creating ChoiceLink: no pipeline. You need to call pipeline() first, and do no calls after done()`);
        const src_q = this._state.pipeline.queues()[src];
        const dst_q = dst.map (q => this._state.pipeline.queues()[q]);

        try {
          const pr = new ChoiceLink (src_q, dst_q, opts);
          pr.on_data (func);
          debug ('[%s]: new ChoiceLink %s', this._state.pipeline.name (), pr.name ());
          cb ();
        }
        catch (e) {
          cb (e);
        }
      }
    );

    return this;
  }

  ///////////////////////////////////////////////////////////
  sink (src, func, opts) {
    this._tasks.push (
      cb => {
        if (!this._state.pipeline) return cb (`when creating Sink: no pipeline. You need to call pipeline() first, and do no calls after done()`);
        const src_q = this._state.pipeline.queues()[src];

        try {
          const pr = new Sink (src_q, opts);
          pr.on_data (func);
          debug ('[%s]: new Sink %s', this._state.pipeline.name (), pr.name ());
          cb ();
        }
        catch (e) {
          cb (e);
        }
      }
    );

    return this;
  }

  ///////////////////////////////////////////////////////////
  onError (fn) {
    // add event listener for error
    this._tasks.push (
      cb => {
        if (!this._state.pipeline) return cb (`when adding onError: no pipeline. You need to call pipeline() first, and do no calls after done()`);
        _.each (this._state.pipeline.processors (), (v, k) => {
          v.on ('error', e => {
            e.processor = v;
            fn (e);
          });

          debug ('added error listener on processor %s', k);
        });

        cb ();
      }
    );

    return this;
  }

  ///////////////////////////////////////////////////////////
  done (cb) {
    async.series (this._tasks, err => {
      if (err) {
        debug ('[%s]: error on creation, resetting state: ', (this._state.pipeline ? this._state.pipeline.name () : '-'), err);
      }
      else {
        debug ('[%s]: created, resetting state', this._state.pipeline.name ());

        // TODO save state of creation into topology db

      }

      const pl = this._state.pipeline;
      this._state.pipeline = null;

      this._state = {};
      this._tasks = [];
      cb (err, pl);
    });
  }
}

module.exports = PipelineBuilder;
