var Queue = require ('./Queue');
var _ =     require ('lodash');

var debug = require('debug')('keuss:PipelineLink');


class PipelineLink {
  constructor (src_q, dst_q, opts) {
    // check both queues are pipelined
    if (! src_q.pipeline) throw Error ('source queue is not pipelined');
    if (! dst_q.pipeline) throw Error ('destination queue is not pipelined');

    // check both queues are of the same type
    if (src_q.type () != dst_q.type ()) throw Error ('queues are of different type');

    // check both queues are on same pipeline
    if (src_q.pipeline ().name () != dst_q.pipeline ().name ()) throw Error ('queues are on different pipelines');

    this._name = src_q.name () + '->' + dst_q.name ();
    this._opts = opts || {};
    this._src = src_q;
    this._dst = dst_q;

    debug ('created PipelineLink %s', this._name);
  }

  src () {return this._src;}
  dst () {return this._dst;}

  name () {return this._name;}

  /////////////////////////////////////////
  start (ondata) {
    this._process (ondata);
  }

  /////////////////////////////////////////
  stop () {
    this._src.cancel ();
  }

  /////////////////////////////////////////
  _mature (opts) {
    if (opts.mature) {
      if (_.isInteger (opts.mature)) {
        opts.mature = new Date (opts.mature * 1000);
      }
    }
    else {
      opts.mature = opts.delay ? Queue.nowPlusSecs (opts.delay) : Queue.now ();
    }
  }

  /////////////////////////////////////////
  _process (ondata) {
    debug ('pll %s: attempting reserve', this._name);

    this.src().pop('c1', { reserve: true }, (err, res) => {
      debug ('pll %s: reserved element: %o', this._name, res);

      if (err) {
        if (err == 'cancel') return; // end the process loop
         debug ('pll %s: error in reserve:', this._name, err);
        return this._process (ondata);
      }

      if (!res) {
        debug ('pll %s: reserve produced nothing', this._name);
        return this._process (ondata);
      }

      // do something
      ondata (res, (err, res0) => {
        debug ('pll %s: processed: %s', this._name, res._id);

        if (err) {
          // error: drop or retry?
          if (err.drop === true) {
            debug ('pll %s: marked to be dropped: %s', this._name, res._id);
            return this._process (ondata);
          }
          else {
            // rollback. TODO set some limit, drop afterwards?
            this.src().ko (res._id, this._rollback_next_t (res), err => {
              debug ('pll %s: rolled back: %s', this._name, res._id);
              this._process (ondata);
            });

            return;
          }
        }

        var opts = {};
        _.merge (opts, this._opts, (res0 && res0.opts) || {});
        this._mature (opts);
        opts.payload = (res0 && res0.payload) || res.payload;

        this._next (res._id, opts, (err, res0) => {
          if (err) debug ('error in next:', err);
          debug ('pll %s: passed to next: %s', this._name, res._id);
          this._process (ondata);
        });
      });
    });
  }

  /////////////////////////////////////////
  _next (id, opts, callback) {
    this.src().pl_step (id, this.dst(), opts, (err, res) => {
      this.src()._stats.incr ('put');
      this.dst()._stats.incr ('get');
      this.dst()._signaller.signalInsertion ((opts && opts.mature) || Queue.now());

      callback (err, res);
    });
  }

  /////////////////////////////////////////
  _rollback_next_t (item) {
    var delta = (item.tries * (this._opts.retry_factor_t || 2)) + (this._opts.retry_base_t || 1);
    return new Date().getTime () + (delta * 1000);
  }
}

module.exports = PipelineLink;
