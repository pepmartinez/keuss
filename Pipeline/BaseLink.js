const _ =            require ('lodash');
const EventEmitter = require ('events');

const Queue = require ('../Queue');

const debug = require('debug')('keuss:Pipeline:BaseLink');


// base class for all pipeline links
// proposed subclasses:
//  * direct (1-to-1)
//  * choice (1-to-onechoice)
//  * fanout (1-to-all)
//  * sink   (1-to-none)
class BaseLink  extends EventEmitter {
  constructor (src_q, opts) {
    super ();

    // check queues are pipelined
    if (!src_q.pipeline) throw Error ('source queue is not pipelined');

    this._opts = opts || {};
    this._src = src_q;
  }

  src () {return this._src;}
  name () {return this._name;}

  static Type () {return 'pipeline:processor:BaseLink';}
  type () {return BaseLink.Type();}


  /////////////////////////////////////////
  on_data (ondata) {
    this._ondata_orig = ondata;
    this._ondata = ondata.bind (this);
  }

  /////////////////////////////////////////
  start (ondata) {
    if (ondata) this.on_data (ondata);
    this._process (this._ondata);
    debug ('%s: started', this._name);
  }

  /////////////////////////////////////////
  stop () {
    this._src.cancel ();
  }


  /////////////////////////////////////////
  _add_to_pipeline () {
    this._src.pipeline()._add_processor (this);
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
  _on_error (err, elem, ondata) {
    // error: drop or retry?
    if (err.drop === true) {
      // drop: commit and forget
      this.src().ok (elem, err => {
        if (err) this.emit ('error', {on: 'src-queue-commit-on-error', elem, err});
        debug ('%s: in error, marked to be dropped: %s', this._name, elem._id);
        this._process (ondata);
      });
    }
    else {
      // retry: rollback
      this.src().ko (elem, this._rollback_next_t (elem), err => {
        if (err) this.emit ('error', {on: 'src-queue-rollback-on-error', elem, err});
        debug ('%s: in error, rolled back: %s', this._name, elem._id);
        this._process (ondata);
      });
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
        this.emit ('error', {on: 'src-queue-pop', err});
        return this._process (ondata);
      }

      if (!elem) {
        debug ('%s: reserve produced nothing', this._name);
        return this._process (ondata);
      }

      // do something
      try {
      ondata (elem, (err, res) => {
        debug ('%s: processed: %s', this._name, elem._id);

        if (err) return this._on_error (err, elem, ondata);

        // drop it (act as sink) ?
        if ((res === false) || (res && res.drop)) {
          // drop: commit and forget
          this.src().ok (elem._id, err => {
            if (err) this.emit ('error', {on: 'src-queue-commit-on-drop', elem, err});
            debug ('%s: processed, marked to be dropped: %s', this._name, elem._id);
            this._process (ondata);
          });
        }
        else {
          // move to next step
          var opts = {};
          _.merge (opts, this._opts, (res && res.opts) || {});
          this._mature (opts);

          if (res) {
            if (res.payload) opts.payload = res.payload;
            if (res.update)  opts.update =  res.update;
            if (!_.isNil (res.dst)) opts.dst = res.dst;
          }

          this._next (elem._id, opts, (err, res) => {
            if (err) {
              debug ('error in next:', err);
              this.emit ('error', {on: 'next-queue', elem, opts, err});
            }

            debug ('%s: passed to next: %s', this._name, elem._id);
            this._process (ondata);
          });
        }
      });
      }
      catch (e) {
        debug ('catch error, emitting it: ', e);
        console.log ('catch error, emitting it: ', e);
        this.emit (e);
        this._on_error (e, elem, ondata);
      }
    });
  }


  /////////////////////////////////////////
  _rollback_next_t (item) {
    var delta = (item.tries * (this._opts.retry_factor_t || 2)) + (this._opts.retry_base_t || 1);
    return new Date().getTime () + (delta * 1000);
  }


  /////////////////////////////////////////
  // TO BE IMPLEMENTED ON SUBCLASSES
  _next (id, opts, cb) {
    cb ();
  }
}

module.exports = BaseLink;
