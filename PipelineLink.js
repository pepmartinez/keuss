'use strict';


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
  
  start (ondata) {
    this._process (ondata);
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

    // ('pll %s: attempting reserve', self._name);

    this.src().pop('c1', { reserve: true }, function (err, res) {
      // ('pll %s: reserved element: %j', self._name, res);

      if (err) {
        // ('pll %s: error in reserve:', self._name, err);
        return self._process (ondata);
      }
      
      if (!res) {
        // ('pll %s: reserve produced nothing', self._name);
        return self._process (ondata);
      }
      
      // do something
      ondata (res, function (err, res0) {
        // ('pll %s: processed: %s', self._name, res._id);

        var opts = {};
        _.merge (opts, self._opts, (res0 && res0.opts) || {});

        self._mature (opts);

        opts.payload = (res0 && res0.payload) || res.payload;

// TODO add something to call rollback or drop, instead of next: use err for that
        self.next (res._id, opts, function (err, res0) {
          if (err) {
//            console.log ('error in next:', err);
          }
          // ('pll %s: passed to next: %s', self._name, res._id);
          return self._process (ondata);
        });
      });
    });
  }

  next (id, opts, callback) {
    var self = this;

    this.src().next (id, this.dst(), opts, function (err, res) {
      self.src()._stats.incr ('put');
      self.dst()._stats.incr ('get');
      self.dst()._signaller.signalInsertion ((opts && opts.mature) || Queue.now());
      
      callback (err, res);
    });
  }
}

module.exports = PipelineLink;
