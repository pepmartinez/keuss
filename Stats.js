

class Stats {
  constructor (ns, name, factory) {
    this._ns = ns;
    this._name = name;
    this._factory = factory;
  }


  type() {
    return this._factory.type();
  }

  ns () {
    return this._ns;
  }

  name () {
    return this._name;
  }


  ////////////////////////////////
  // to be redefined
  values (cb) {cb ();}
  paused (val, cb) {cb ();}
  incr (v, delta, cb) {cb();}
  decr (v, delta, cb) {cb();}
  opts (opts, cb) {cb();}
  clear (cb) {cb();}
  close (cb) {cb();}
}

module.exports = Stats;
