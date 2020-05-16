var debug = require('debug')('keuss:Pipeline:Sink');

const BaseLink = require ('./BaseLink');

class Sink extends BaseLink{
  constructor (src_q, opts) {
    super (src_q, opts);

    this._name = src_q.name () + '->(sink)';
    this._add_to_pipeline ();
    debug ('created Pipeline/Sink %s', this._name);
  }

  static Type () {return 'pipeline:processor:Sink';}
  type () {return Sink.Type();}

  to_yaml_obj () {
    let obj = super.to_yaml_obj ();
    return obj;
  }

  /////////////////////////////////////////
  _next (id, opts, callback) {
    this.src().ok (id, (err, res) => {
      debug ('element %s dropped in sink', this._name);
      callback (err, res);
    });
  }
}

module.exports = Sink;
