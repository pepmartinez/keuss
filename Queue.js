'use strict';

var MemStats = require ('./stats/mem');
var WithLog =  require ('./utils/WithLog');


class Queue extends WithLog {
  //////////////////////////////////////////////
  constructor (name, opts) {
  //////////////////////////////////////////////
    if (!name) {
      throw new Error ('provide a queue name');
    }
    
    super (opts);
    
    // original opts
    this._opts = opts || {};
    
    if (!this._opts.stats) {
      this._opts.stats = {};
    }
    
    if (!this._opts.stats.opts) {
      this._opts.stats.opts = {}
    }
    
    this._opts.stats.opts.logger = this.logger ();
    this._opts.stats.opts.level =  this.level ();
    
    // queue name
    this._name = name;
    
    // stats
    var stats_factory = this._opts.stats.provider || new MemStats ();
    this._stats = stats_factory.stats (this.type () + ':' + this.name (), this._opts.stats.opts);
    
    // most mature
    this._next_mature_t = null;
  }
  
  
  stats (cb) {this._stats.values (cb)}
  
  // placeholder methods
  name () {return this._name}
  type () {return 'queue:base'}
  
  // queue size NOT including non-mature elements
  size (cb) {cb ()}
  
  // queue size including non-mature elements
  totalSize (cb) {cb ()}
  
  // T of next mature
  nextMatureDate () {return this._next_mature_t}
  
  status (cb) {
    var self = this;
    
    this.stats (function (err, stats_res) {
      if (err) {
        return cb (err);
      }
    
      self.next_t (function (err, nt_res) {
        if (err) {
          return cb (err);
        }
        
        cb (null, {
          stats:         stats_res,
          next_mature_t: (nt_res ? nt_res.getTime() : nt_res),
          type:          self.type ()
        });
      });
    })
  }
  
  consumers () {return null}
    
  // private
  static now ()             {return (new Date ());}
  static nowPlusSecs (secs) {return (new Date (Date.now () + secs * 1000));}
}

module.exports = Queue;
