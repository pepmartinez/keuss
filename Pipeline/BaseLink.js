var Queue = require ('../Queue');
var _ =     require ('lodash');

var debug = require('debug')('keuss:Pipeline:BaseLink');


// base class for all pipeline links
// proposed subclasses:
//  * direct (1-to-1)
//  * choice (1-to-onechoice)
//  * fanout (1-to-all)
//  * sink   (1-to-none)
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
    this._ondata = ondata.bind (this);
    this._process (this._ondata);
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
    debug ('%s: attempting reserve', this._name);

    this.src().pop('c1', { reserve: true }, (err, elem) => {
      debug ('%s: reserved element: %o', this._name, elem);

      if (err) {
        if (err == 'cancel') return; // end the process loop
         debug ('%s: error in reserve:', this._name, err);
        return this._process (ondata);
      }

      if (!elem) {
        debug ('%s: reserve produced nothing', this._name);
        return this._process (ondata);
      }

      // do something
      ondata (elem, (err, res) => {
        debug ('%s: processed: %s', this._name, elem._id);

        if (err) {
          // error: drop or retry?
          if (err.drop === true) {
            // drop: commit and forget
            this.src().ok (elem._id, err => {
              debug ('%s: in error, marked to be dropped: %s', this._name, elem._id);
              this._process (ondata);
            });
          }
          else {
            // retry: rollback
            this.src().ko (elem._id, this._rollback_next_t (elem), err => {
              debug ('%s: in error, rolled back: %s', this._name, elem._id);
              this._process (ondata);
            });
          }

          return;
        }

        // drop it (act as sink) ?
        if ((res === false) || (res && res.drop)) {
          // drop: commit and forget
          this.src().ok (elem._id, err => {
            debug ('%s: processed, marked to be dropped: %s', this._name, elem._id);
            this._process (ondata);
          });
        }
        else {
          // move to next step
          var opts = {};
          _.merge (opts, this._opts, (res && res.opts) || {});
          this._mature (opts);
          opts.payload = (res && res.payload);
          opts.update =  (res && res.update);

          this._next (elem._id, opts, (err, res) => {
            if (err) debug ('error in next:', err);
            debug ('%s: passed to next: %s', this._name, elem._id);
            this._process (ondata);
          });
        }
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
