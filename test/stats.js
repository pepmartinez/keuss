
//var log = require('why-is-node-running')

var should =  require ('should');
var async =   require ('async');

var Mem =   require ('../stats/mem');
var Redis = require ('../stats/redis');
var Mongo = require ('../stats/mongo');

var ns = 'some-class';
var name = 'test-stats';

function run_tests_on_class (CL) {
  describe (CL.Type () + ' stats provider', function () {
    
    before (function (done) {
      done();
    });
    
    after  (function (done) {
      done();
    });
    
    it ('creates ok', function (done) {
      var ftry = new CL ();
      var mem = ftry.stats (ns, name);
      mem.values (function (err, vals) {
        vals.should.eql ({});
        ftry.close();
        done (err);
      });
    });
    
    it ('initializes ok', function (done) {
      var ftry = new CL ();
      var mem = ftry.stats (ns, name);
      
      async.series([
        function (cb) {mem.incr ('v1', 1, cb)},
        function (cb) {mem.incr ('v2', 1, cb)},
        function (cb) {mem.incr ('v3', 1, cb)}
      ], function(err, results) {
        setTimeout (function () {
          mem.ns().should.equal (ns);
          mem.name().should.equal (name);
          mem.values (function (err, vals) {
            vals.should.eql ({v1: 1, v2: 1, v3: 1});
            mem.clear (function (err) {
              ftry.close();
              done (err);
            });
          });
        }, 200);
      });
    });
    
    it ('increments (default by 1) ok', function (done) {
      var ftry = new CL ();
      var mem = ftry.stats (ns, name);
      
      async.series([
        function (cb) {mem.clear (cb)},
        function (cb) {mem.incr ('v1', 0, cb)},
        function (cb) {mem.incr ('v1', undefined, cb)},
        function (cb) {mem.incr ('v1', undefined, cb)}
      ], function(err, results) {
        setTimeout (function () {
          mem.values (function (err, vals) {
            vals.should.eql ({v1: 2});
            mem.clear (function (err) {
              ftry.close();
              done (err);
            });
          });
        }, 200);
      });
    });
    
    it ('increments (explicit deltas) ok', function (done) {
      var ftry = new CL ();
      var mem = ftry.stats (ns, name);
      
      async.series([
        function (cb) {mem.clear (cb)},
        function (cb) {mem.incr ('v1', 0, cb)},
        function (cb) {mem.incr ('v1', undefined, cb)},
        function (cb) {mem.incr ('v1', 3, cb)}
      ], function(err, results) {
        setTimeout (function () {
          mem.values (function (err, vals) {
            vals.should.eql ({v1: 4});
            ftry.close();
            done (err);
          });
        }, 200);
      });
    });
    
    it ('decrements (default by 1) ok', function (done) {
      var ftry = new CL ();
      var mem = ftry.stats (ns, name);
      
      async.series([
        function (cb) {mem.clear (cb)},
        function (cb) {mem.incr ('v1', 1, cb)},
        function (cb) {mem.incr ('v1', undefined, cb)},
        function (cb) {mem.decr ('v1', undefined, cb)}
      ], function(err, results) {
        setTimeout (function () {
          mem.values (function (err, vals) {
            vals.should.eql ({v1: 1});
            ftry.close();
            done (err);
          });
        }, 200);
      });
    });
    
    it ('decrements (explicit deltas) ok', function (done) {
      var ftry = new CL ();
      var mem = ftry.stats (ns, name);
      
      async.series([
        function (cb) {mem.clear (cb)},
        function (cb) {mem.incr ('v1', 0, cb)},
        function (cb) {mem.incr ('v1', 6, cb)},
        function (cb) {mem.decr ('v1', 4, cb)},
        function (cb) {
          setTimeout (function () {
            mem.values (function (err, vals) {vals.should.eql ({v1: 2});cb();});
          }, 200);
        },
        function (cb) {mem.decr ('v1', 4, cb)},
        function (cb) {
          setTimeout (function () {
            mem.values (function (err, vals) {vals.should.eql ({v1: -2});cb();});
          }, 200);
        }
      ], function(err, results) {
        ftry.close();
        done (err);
      });
    });
    
    it ('manages topology ok', function (done) {
      var ftry = new CL ();
      var mem = ftry.stats (ns, name);
      var topology = {a:1, b: {t:'yy', tt: 99}};

      async.series([
        function (cb) {mem.clear (cb)},
        function (cb) {mem.topology (topology, cb)},
        function (cb) {
          setTimeout (function () {
            mem.topology (function (err, tplg) {
              tplg.should.eql (topology);
              cb();
            });
          }, 200);
        },
        function (cb) {mem.clear (cb)},
        function (cb) {
          setTimeout (function () {
            cb();
          }, 200);
        }
      ], function(err, results) {
        ftry.close();
        done (err);
      });
    });
    
    it ('manages concise & full listing ok', function (done) {
      var ftry = new CL ();
      var mem1 = ftry.stats (ns, name);
      var mem2 = ftry.stats (ns, name + '-2');
      var opts1 = {s:0, a: 'yy'};
      var opts2 = {s:7, at: 'yy--j'};
      var topology1 = {a:1, b: {t:'yy', tt: 99}};
      var topology2 = {a:17, b: {t:'yyuyyrtyurt', tt: 77777}, cc: 7};

      async.series([
        function (cb) {mem1.clear (cb)},
        function (cb) {mem2.clear (cb)},
        function (cb) {mem1.topology (topology1, cb)},
        function (cb) {mem2.topology (topology2, cb)},
        function (cb) {mem1.opts (opts1, cb)},
        function (cb) {mem2.opts (opts2, cb)},
        function (cb) {mem1.incr ('v1', 8, cb)},
        function (cb) {mem1.incr ('v2', 6, cb)},
        function (cb) {mem2.incr ('v1', 4, cb)},
        function (cb) {mem2.incr ('v3', 45, cb)},
        function (cb) {
          setTimeout (function () {
            ftry.queues (ns, function (err, res) {
              if (err) return cb (err);
              res.sort().should.eql ([ 'test-stats', 'test-stats-2' ]);
              cb ();
            })
          }, 200);
        },
        function (cb) {
          setTimeout (function () {
            ftry.queues (ns, {full: true}, function (err, res) {
              if (err) return cb (err);
              res.should.eql ({ 
                'test-stats': { name: 'test-stats', ns: 'some-class', topology: topology1, opts: opts1, counters: {v1: 8, v2: 6 } },
                'test-stats-2': { name: 'test-stats-2', ns: 'some-class', topology: topology2, opts: opts2, counters: {v1: 4, v3: 45} } 
              });
              
              cb ();
            })
          }, 200);
        }
      ], function(err, results) {
        ftry.close();
        done (err);
      });
    });
    
    it ('clears ok', function (done) {
      var ftry = new CL ();
      var mem = ftry.stats (ns, name);
      
      async.series([
        function (cb) {mem.clear (cb)},
        function (cb) {mem.incr ('v1', 0, cb)},
        function (cb) {mem.incr ('v1', 6, cb)},
        function (cb) {mem.incr ('v2', 6, cb)},
        function (cb) {mem.decr ('v2', 4, cb)},
        function (cb) {
          setTimeout (function () {
            mem.values (function (err, vals) {vals.should.eql ({v1: 6, v2: 2});cb();});
          }, 200);
        },
        function (cb) {mem.clear (cb)},
        function (cb) {
          setTimeout (function () {
            mem.values (function (err, vals) {vals.should.eql ({});cb();});
          }, 200);
        }
      ], function(err, results) {
        ftry.close();
        done (err);
      });
    });
    
  });
}


run_tests_on_class (Mem);
run_tests_on_class (Redis);
run_tests_on_class (Mongo);
