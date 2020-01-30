
var async =  require ('async');
var should = require ('should');
var MongoClient = require ('mongodb').MongoClient;

var factory = null;

[
//  {label: 'redis list',          backend: require ('../backends/redis-list')},
//  {label: 'redis OrderedQueue',  backend: require ('../backends/redis-oq')},
//  {label: 'pipeline MongoDB',    backend: require ('../backends/pl-mongo')},
//  {label: 'persistent MongoDB',  backend: require ('../backends/ps-mongo')},
//  {label: 'plain MongoDB',       backend: require ('../backends/mongo')},
//  {label: 'MongoDB Bucket',      backend: require ('../backends/bucket-mongo')},
  {label: 'Safe MongoDB Bucket', backend: require ('../backends/bucket-mongo-safe')},
].forEach (backend_item => {
  [
    {label: 'mem',   stats: require('../stats/mem')},
    {label: 'mongo', stats: require('../stats/mongo')},
    {label: 'redis', stats: require('../stats/redis')},
  ].forEach (stats_item => {
    [
      {label: 'local', signal: require ('../signal/local')},
    ].forEach (signal_item => {
      describe (`pause/resume tests with backend ${backend_item.label}, stats ${stats_item.label}, signal ${signal_item.label}`, () => {
        var MQ = backend_item.backend;

        before (done => {
          var opts = {
            url: 'mongodb://localhost/keuss_test_pause',
            signaller: {
              provider: signal_item.signal
            },
            stats: {
              provider: stats_item.stats
            }
          };

          MQ (opts, (err, fct) => {
            if (err) return done (err);
            factory = fct;
            done();
          });
        });

        after (done => {
          async.series ([
            cb => factory.close (cb),
            cb => MongoClient.connect ('mongodb://localhost/keuss_test_pause', (err, cl) => {
              if (err) return done (err);
              cl.db().dropDatabase (() => cl.close (cb))
            })
          ], done);
        });

        it ('queue pauses and resumes ok, existing consumers react accordingly', done => {
          var q = factory.queue('bench_test_queue_0', {});

          async.series ([
            cb => q._stats.clear (cb),
            cb => async.parallel ([
              cb => q.push ({q:0, a: 'ryetyeryre 0'}, cb),
              cb => q.push ({q:1, a: 'ryetyeryre 1'}, cb),
              cb => q.push ({q:2, a: 'ryetyeryre 2'}, cb),
              cb => q.push ({q:3, a: 'ryetyeryre 3'}, cb),
              cb => q.push ({q:4, a: 'ryetyeryre 4'}, cb),
              cb => q.push ({q:5, a: 'ryetyeryre 5'}, cb),
            ], cb),

            cb => async.parallel ([
              cb => setTimeout (() => q.pop ('me', cb), 1000),
              cb => setTimeout (() => q.pop ('me', cb), 1000),
              cb => setTimeout (() => q.pop ('me', cb), 1000),
              cb => setTimeout (() => q.pop ('me', cb), 1000),
              cb => setTimeout (() => q.pop ('me', cb), 1000),
              cb => setTimeout (() => q.pop ('me', cb), 1000),

              cb => setTimeout (() => {q.pause(true); cb ();}, 100),
              cb => setTimeout (() => {q.pause(false); cb ();}, 2000),
            ], cb),

            cb => q.stats(cb),
            cb => q.size (cb),
            cb => q._stats.clear (cb),

          ], (err, res) => {
            if (err) return done (err);
            res[3].should.eql ({ put: 6, get: 6 });
            res[4].should.equal (0);
            q.nConsumers().should.equal (0);

            done ();
          });
      });

      });
    });
  });
});

