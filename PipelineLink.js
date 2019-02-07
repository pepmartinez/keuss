var Queue = require ('./Queue');
var _ =     require ('lodash');


class PipelineLink {
  constructor (src_q, dst_q, opts) {
    // check both queues are pipelined
    if (! src_q.pipeline){
      throw Error ('source queue is not pipelined');
    }
    if (! dst_q.pipeline){
      throw Error ('destination queue is not pipelined');
    }

    // check both queues are of the same type
    if (src_q.type () != dst_q.type ()) {
      throw Error ('queues are of different type');
    }

    // check both queues are on same pipeline
    if (src_q.pipeline ().name () != dst_q.pipeline ().name ()) {
      throw Error ('queues are on different pipelines');
    }

    this._name = src_q.name () + '->' + dst_q.name ();
    this._opts = opts || {};
    this._src = src_q;
    this._dst = dst_q;
  }

  src () {return this._src}
  dst () {return this._dst}
  
  name () {return this._name}
  
  start (ondata) {
    this._process (ondata);
  }

  stop () {
    this._src.cancel ();
  }

  _mature (opts) {
    var mature = null;

    if (opts.mature) {
      if (_.isInteger (opts.mature)) {
        opts.mature = new Date (opts.mature * 1000);
      }
    }
    else {
      opts.mature = opts.delay ? Queue.nowPlusSecs (opts.delay) : Queue.now ();
    }
  }

  _process (ondata) {
    var self = this;

   // console.log ('pll %s: attempting reserve', self._name);

    this.src().pop('c1', { reserve: true }, function (err, res) {
     // console.log ('pll %s: reserved element: %j', self._name, res);

      if (err) {
        if (err == 'cancel') return; // end the process loop

        // console.log ('pll %s: error in reserve:', self._name, err);
        return self._process (ondata);
      }
      
      if (!res) {
       // console.log ('pll %s: reserve produced nothing', self._name);
        return self._process (ondata);
      }
      
      // do something
      ondata (res, function (err, res0) {
       // console.log ('pll %s: processed: %s', self._name, res._id);

        if (err) {
          // error: drop or retry?
          if (err.drop === true) {
         // console.log ('pll %s: marked to be dropped: %s', self._name, res._id);
            return self._process (ondata);
          }
          else {
            // rollback. TODO set some limit, drop afterwards?
            self.src().ko (res._id, self._rollback_next_t (res), function (err) {
             // console.log ('pll %s: rolled back: %s', self._name, res._id);
              self._process (ondata);
            });

            return;
          }
        }

        var opts = {};
        _.merge (opts, self._opts, (res0 && res0.opts) || {});
        self._mature (opts);
        opts.payload = (res0 && res0.payload) || res.payload;

        self._next (res._id, opts, function (err, res0) {
          if (err) {
//           // console.log ('error in next:', err);
          }
         // console.log ('pll %s: passed to next: %s', self._name, res._id);
          self._process (ondata);
        });
      });
    });
  }

  _next (id, opts, callback) {
    var self = this;

    this.src().pl_step (id, this.dst(), opts, function (err, res) {
      self.src()._stats.incr ('put');
      self.dst()._stats.incr ('get');
      self.dst()._signaller.signalInsertion ((opts && opts.mature) || Queue.now());
      
      callback (err, res);
    });
  }

  _rollback_next_t (item) {
    var delta = (item.tries * (this._opts.retry_factor_t || 2)) + (this._opts.retry_base_t || 1);
    return new Date().getTime () + (delta * 1000);
  }
}

module.exports = PipelineLink;
