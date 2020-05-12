var Queue = require ('../Queue');
var _ =     require ('lodash');

var debug = require('debug')('keuss:Pipeline:DirectLink');

const BaseLink = require ('./BaseLink');

class DirectLink extends BaseLink{
  constructor (src_q, dst_q, opts) {
    super (src_q, opts);

    // check queues are pipelined
    if (! dst_q.pipeline) throw Error ('destination queue is not pipelined');

    // check both queues are of the same type
    if (src_q.type () != dst_q.type ()) throw Error ('queues are of different type');

    // check both queues are on same pipeline
    if (src_q.pipeline ().name () != dst_q.pipeline ().name ()) throw Error ('queues are on different pipelines');

    this._name = src_q.name () + '->' + dst_q.name ();
    this._dst = dst_q;

    debug ('created Pipeline/DirectLink %s', this._name);
  }

  dst () {return this._dst;}


  /////////////////////////////////////////
  _next (id, opts, cb) {
    this.src().pl_step (id, this.dst(), opts, (err, res) => {
      this.src()._stats.incr ('put');
      this.dst()._stats.incr ('get');
      this.dst()._signaller.signalInsertion ((opts && opts.mature) || Queue.now());

      cb (err, res);
    });
  }
}

module.exports = DirectLink;
