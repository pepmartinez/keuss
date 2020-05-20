
//var log = require('why-is-node-running')

var should = require ('should');
var async =  require ('async');
var _ =      require ('lodash');

var Mem =   require ('../stats/mem');
var Redis = require ('../stats/redis');
var Mongo = require ('../stats/mongo');

var ns = 'some-class';
var name = 'test-stats';


var tests = {
  Mem: Mem,
  Redis: Redis,
  Mongo: Mongo
};

_.forEach (tests, (CL, CLName) => {

  describe (CLName + ' stats provider', function () {

    before (done => {
      done();
    });

    after (done => async.series ([
      cb => setTimeout (cb, 1000),
    ], done));

    it ('creates ok', done => {
      CL ((err, ftry) => {
        if (err) return done(err);
        var mem = ftry.stats (ns, name);
        mem.values (function (err, vals) {
          vals.should.eql ({});
          ftry.close(done);
        });
      });
    });

    it ('initializes ok', done => {
      CL ((err, ftry) => {
        if (err) return done(err);
        var mem = ftry.stats (ns, name);

        async.series([
          cb => mem.incr ('v1', 1, cb),
          cb => mem.incr ('v2', 1, cb),
          cb => mem.incr ('v3', 1, cb)
        ], (err, results) => {
          async.series ([
            cb => setTimeout (cb, 200),
            cb => mem.values (cb),
            cb => mem.paused (cb)
          ], (err, res) => {
            if (err) return done (err);
            mem.ns().should.equal (ns);
            mem.name().should.equal (name);
            res[1].should.eql ({v1: 1, v2: 1, v3: 1});
            res[2].should.eql (false);
            mem.clear (() => ftry.close(done));
          });
        });
      });
    });

    it ('increments (default by 1) ok', done => {
      CL ((err, ftry) => {
        if (err) return done(err);
        var mem = ftry.stats (ns, name);

        async.series([
          cb => mem.clear (cb),
          cb => mem.incr ('v1', 0, cb),
          cb => mem.incr ('v1', undefined, cb),
          cb => mem.incr ('v1', undefined, cb)
        ], (err, results) => {
          setTimeout (() => mem.values ((err, vals) => {
            vals.should.eql ({v1: 2});
            mem.clear (() => ftry.close(done));
          }), 200);
        });
      });
    });

    it ('increments (explicit deltas) ok', done => {
      CL ((err, ftry) => {
        if (err) return done(err);
        var mem = ftry.stats (ns, name);

        async.series([
          cb => mem.clear (cb),
          cb => mem.incr ('v1', 0, cb),
          cb => mem.incr ('v1', undefined, cb),
          cb => mem.incr ('v1', 3, cb)
        ], (err, results) => {
          setTimeout ( () => mem.values ((err, vals) => {
            vals.should.eql ({v1: 4});
            ftry.close(done);
          }), 200);
        });
      });
    });

    it ('decrements (default by 1) ok', done => {
      CL ((err, ftry) => {
        if (err) return done(err);
        var mem = ftry.stats (ns, name);

        async.series([
          cb => mem.clear (cb),
          cb => mem.incr ('v1', 1, cb),
          cb => mem.incr ('v1', undefined, cb),
          cb => mem.decr ('v1', undefined, cb)
        ], (err, results) => {
          setTimeout (() => mem.values ((err, vals) => {
            vals.should.eql ({v1: 1});
            ftry.close(done);
          }), 200);
        });
      });
    });

    it ('decrements (explicit deltas) ok', done => {
      CL ((err, ftry) => {
        if (err) return done(err);
        var mem = ftry.stats (ns, name);

        async.series([
          cb => mem.clear (cb),
          cb => mem.incr ('v1', 0, cb),
          cb => mem.incr ('v1', 6, cb),
          cb => mem.decr ('v1', 4, cb),
          cb => setTimeout (() => mem.values ((err, vals) => {
            vals.should.eql ({v1: 2});
            cb();
          }), 200),
          cb => mem.decr ('v1', 4, cb),
          cb => setTimeout (() => mem.values ((err, vals) => {
            vals.should.eql ({v1: -2});
            cb();
          }), 200)
        ], (err, results) => {
          ftry.close();
          done (err);
        });
      });
    });


    it ('manages pause/resume ok', done => {
      CL ((err, ftry) => {
        if (err) return done(err);
        var mem = ftry.stats (ns, name);

        async.series([
          cb => mem.clear (cb),
          cb => mem.paused (cb),
          cb => mem.paused (true, cb),
          cb => mem.paused (cb),
          cb => mem.paused (false, cb),
          cb => mem.paused (cb),
          cb => mem.paused (false, cb),
          cb => mem.paused (cb),
          cb => setTimeout (cb, 200)
        ], (err, results) => {
          results.should.eql ([ undefined,
  false,
  undefined,
  true,
  undefined,
  false,
  undefined,
  false,
  undefined ]);
          ftry.close();
          done (err);
        });
      });
    });

    it ('manages concise & full listing ok', done => {
      CL ((err, ftry) => {
        if (err) return done(err);
        var mem1 = ftry.stats (ns, name);
        var mem2 = ftry.stats (ns, name + '-2');
        var opts1 = {s:0, a: 'yy'};
        var opts2 = {s:7, at: 'yy--j'};

        async.series([
          cb => mem1.clear (cb),
          cb => mem2.clear (cb),
          cb => mem1.opts (opts1, cb),
          cb => mem2.opts (opts2, cb),
          cb => mem1.incr ('v1', 8, cb),
          cb => mem1.incr ('v2', 6, cb),
          cb => mem2.incr ('v1', 4, cb),
          cb => mem2.incr ('v3', 45, cb),
          cb => setTimeout (() => ftry.queues (ns, (err, res) => {
            if (err) return cb (err);
            res.sort().should.eql ([ 'test-stats', 'test-stats-2' ]);
            cb ();
          }), 200),
          cb => setTimeout (() => ftry.queues (ns, {full: true}, (err, res) => {
            if (err) return cb (err);
            res.should.eql ({
              'test-stats': { name: 'test-stats', ns: 'some-class', opts: opts1, counters: {v1: 8, v2: 6 }, paused: false },
              'test-stats-2': { name: 'test-stats-2', ns: 'some-class', opts: opts2, counters: {v1: 4, v3: 45}, paused: false }
            });

            cb ();
          }), 200)
        ], (err, results) => {
          ftry.close();
          done (err);
        });
      });
    });

    it ('clears ok', done => {
      CL ((err, ftry) => {
        if (err) return done(err);
        var mem = ftry.stats (ns, name);

        async.series([
          cb => mem.clear (cb),
          cb => mem.incr ('v1', 0, cb),
          cb => mem.incr ('v1', 6, cb),
          cb => mem.incr ('v2', 6, cb),
          cb => mem.decr ('v2', 4, cb),
          cb => setTimeout (() => mem.values ((err, vals) => {
            vals.should.eql ({v1: 6, v2: 2});
            cb();
          }), 200),
          cb => mem.clear (cb),
          cb => setTimeout (() => mem.values ((err, vals) => {
            vals.should.eql ({});
            cb();
          }), 200)
        ], (err, results) => {
          ftry.close();
          done (err);
        });
      });
    });
  });
});
