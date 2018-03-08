'use strict';

class MemStats {
  constructor (factory) {
    this._factory = factory;
    this._s = {};
  }
  
  type () {return this._factory.type ()}
  
  values (cb) {
    cb (null, this._s);
  }
  
  incr (v, delta, cb) {
    if (!this._s[v]) {
      this._s[v] = 0;
    }
    
    if ((delta == null) || (delta == undefined)) delta = 1;
    this._s[v] = this._s[v] + delta;
    if (cb) cb(null, this._s[v]);
  }
  
  decr (v, delta, cb) {
    if ((delta == null) || (delta == undefined)) delta = 1;
    this.incr (v, -delta, cb)
  }
  
  clear (cb) {
    this._s = {};
    if (cb) cb();
  } 
}

class MemStatsFactory {
  constructor (opts) {
  }

  static Type () {return 'mem'}
  type () {return Type ()}

  queues (qclass, cb) {
    cb(null, []);
  }

  stats () {
    return new MemStats (this);
  }

  close () {
  }
}

module.exports = MemStatsFactory;
