'use strict';

class MemStats {
  constructor () {
    this._s = {};
  }
  
  static type () {return 'mem'}
  static init (opts) {}
  
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


module.exports = MemStats;
