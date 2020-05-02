var Queue = require ('../Queue');
var _ =     require ('lodash');

var debug = require('debug')('keuss:Pipeline:ChoiceLink');

const BaseLink = require ('./BaseLink');

class ChoiceLink extends BaseLink{
  constructor (src_q, dst_q_array, opts) {
    super (src_q, opts);

    if (! _.isArray (dst_q_array)) {
      throw Error ('destination-queues is not an array');
    }

    this._dst_q_array = dst_q_array;
    this._dst_q_idx = {};

    // check queues are pipelined, same type, same pipeline
    _.each (dst_q_array, dst_q => {
      if (! dst_q.pipeline)                                       throw Error ('destination queue is not pipelined');
      if (src_q.type () != dst_q.type ())                         throw Error ('queues are of different type');
      if (src_q.pipeline ().name () != dst_q.pipeline ().name ()) throw Error ('queues are on different pipelines');

      this._dst_q_idx[dst_q.name ()] = dst_q;
    });

    this._name = src_q.name () + '->{' + _.join (_.map (dst_q_array, i => i.name()), ',') + '}';

    debug ('created Pipeline/ChoiceLink %s', this._name);
  }


  dst_by_idx  (idx)  {return this._dst_q_array[idx];}
  dst_by_name (name) {return this._dst_q_idx[name];}


  /////////////////////////////////////////
  _next (id, opts, cb) {
    let dst = null;

    if (! _.isNil (opts.dst)) {
      if (_.isInteger (opts.dst)) dst = this.dst_by_idx (opts.dst);
      else if (_.isString (opts.dst)) dst = this.dst_by_name (opts.dst);
    }

    if (!dst) return cb ({e: 'ill-specified dst queue'});

    this.src().pl_step (id, dst, opts, (err, res) => {
      this.src()._stats.incr ('put');
      dst._stats.incr ('get');
      dst._signaller.signalInsertion ((opts && opts.mature) || Queue.now());

      debug ('element passed to next queue %s', dst.name ());
      cb (err, res);
    });
  }
}

module.exports = ChoiceLink;
