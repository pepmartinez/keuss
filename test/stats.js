
//var log = require('why-is-node-running')

var should =  require ('should');
var async =   require ('async');

var Mem =   require ('../stats/mem');
var Redis = require ('../stats/redis');

var name = 'test-stats';

function run_tests_on_class (CL) {
  describe (CL.Type () + ' stats provider', function () {
    
    before (function (done) {
      var ftry = new CL ();
      var mem = ftry.stats (name);
      mem.clear (done);
      ftry.close();
    });
    
    after  (function (done) {
      var ftry = new CL ();
      var mem = ftry.stats (name);
      mem.clear (done);

 //     setTimeout(function () {
 //       log() // logs out active handles that are keeping node running
 //     }, 100)

    });
    
    it ('creates ok', function (done) {
      var mem = new CL ().stats (name);
      var ftry = new CL ();
      var mem = ftry.stats (name);
      mem.values (function (err, vals) {
        vals.should.eql ({});
        ftry.close();
        done (err);
      });
    });
    
    it ('initializes ok', function (done) {
      var ftry = new CL ();
      var mem = ftry.stats (name);
      
      async.series([
        function (cb) {mem.incr ('v1', 1, cb)},
        function (cb) {mem.incr ('v2', 1, cb)},
        function (cb) {mem.incr ('v3', 1, cb)}
      ], function(err, results) {
        setTimeout (function () {
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
      var mem = ftry.stats (name);
      
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
      var mem = ftry.stats (name);
      
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
      var mem = ftry.stats (name);
      
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
      var mem = ftry.stats (name);
      
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
    
    it ('clears ok', function (done) {
      var ftry = new CL ();
      var mem = ftry.stats (name);
      
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


//run_tests_on_class (Mem);
run_tests_on_class (Redis);
