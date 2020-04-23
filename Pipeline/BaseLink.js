var Queue = require ('../Queue');
var _ =     require ('lodash');

var debug = require('debug')('keuss:Pipeline:BaseLink');


class BaseLink {
  constructor (src_q, opts) {
    // check queues are pipelined
    if (! src_q.pipeline) throw Error ('source queue is not pipelined');

    this._opts = opts || {};
    this._src = src_q;
  }

  src () {return this._src;}
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

    this.src().pop('c1', { reserve: true }, (err, elem) => {
      debug ('pll %s: reserved element: %o', this._name, elem);

      if (err) {
        if (err == 'cancel') return; // end the process loop
         debug ('pll %s: error in reserve:', this._name, err);
        return this._process (ondata);
      }

      if (!elem) {
        debug ('pll %s: reserve produced nothing', this._name);
        return this._process (ondata);
      }

      // do something
      ondata (elem, (err, res) => {
        debug ('pll %s: processed: %s', this._name, elem._id);

        if (err) {
          // error: drop or retry?
          if (err.drop === true) {
            debug ('pll %s: marked to be dropped: %s', this._name, elem._id);
            return this._process (ondata);
          }
          else {
            // rollback
            this.src().ko (elem._id, this._rollback_next_t (elem), err => {
              debug ('pll %s: rolled back: %s', this._name, elem._id);
              this._process (ondata);
            });

            return;
          }
        }

        var opts = {};
        _.merge (opts, this._opts, (res && res.opts) || {});
        this._mature (opts);
        opts.payload = (res && res.payload);
        opts.update =  (res && res.update);

        this._next (elem._id, opts, (err, res) => {
          if (err) debug ('error in next:', err);
          debug ('pll %s: passed to next: %s', this._name, elem._id);
          this._process (ondata);
        });
      });
    });
  }


  /////////////////////////////////////////
  _rollback_next_t (item) {
    var delta = (item.tries * (this._opts.retry_factor_t || 2)) + (this._opts.retry_base_t || 1);
    return new Date().getTime () + (delta * 1000);
  }


  /////////////////////////////////////////
  // TO BE IMPLEMENTED ON SUBCLASSES
  _next (id, opts, callback) {
    callback ();
  }
}

module.exports = BaseLink;
