
var async =  require ('async');
var should = require ('should');
var _ =      require ('lodash');
var MongoClient = require ('mongodb').MongoClient;

var factory = null;

[
  {label: 'redis list',          backend: require ('../backends/redis-list')},
  {label: 'redis OrderedQueue',  backend: require ('../backends/redis-oq')},
  {label: 'pipeline MongoDB',    backend: require ('../backends/pl-mongo')},
  {label: 'persistent MongoDB',  backend: require ('../backends/ps-mongo')},
  {label: 'Stream MongoDB',      backend: require ('../backends/stream-mongo')},
  {label: 'plain MongoDB',       backend: require ('../backends/mongo')},
  {label: 'Safe MongoDB Bucket', backend: require ('../backends/bucket-mongo-safe')},
].forEach (backend_item => {
  [
    {label: 'mem',   stats: require('../stats/mem')},
    {label: 'mongo', stats: require('../stats/mongo')},
    {label: 'redis', stats: require('../stats/redis')},
  ].forEach (stats_item => {
    [
      {label: 'local',        signal: require ('../signal/local')},
      {label: 'redis-pubsub', signal: require ('../signal/redis-pubsub')},
      {label: 'mongo-capped', signal: require ('../signal/mongo-capped')},
    ].forEach (signal_item => {
      describe (`pause/resume tests with backend ${backend_item.label}, stats ${stats_item.label}, signal ${signal_item.label}`, () => {
        var MQ = backend_item.backend;

        before (done => {
          var opts = {
            url: 'mongodb://localhost/keuss_test_pause',
            signaller: {
              provider: signal_item.signal,
              opts: {url: 'mongodb://localhost/keuss_test_pause_signal'}
            },
            stats: {
              provider: stats_item.stats,
              opts: {url: 'mongodb://localhost/keuss_test_pause_stats'}
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
            cb => setTimeout (cb, 1000),
            cb => factory.close (cb),
            cb => MongoClient.connect ('mongodb://localhost/keuss_test_pause', (err, cl) => {
              if (err) return done (err);
              cl.db().dropDatabase (() => cl.close (cb))
            }),
            cb => MongoClient.connect ('mongodb://localhost/keuss_test_pause_stats', (err, cl) => {
              if (err) return done (err);
              cl.db().dropDatabase (() => cl.close (cb))
            }),
            cb => MongoClient.connect ('mongodb://localhost/keuss_test_pause_signal', (err, cl) => {
              if (err) return done (err);
              cl.db().dropDatabase (() => cl.close (cb))
            })
          ], done);
        });

        it ('queue pauses and resumes ok, existing consumers react accordingly', done => {
          var q = factory.queue('_test_0_queue_', {});

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

            cb => setTimeout (cb, 1000),

            cb => q.stats(cb),
            cb => q.size (cb),
            cb => q._stats.clear (cb),

          ], (err, res) => {
            if (err) return done (err);
            res[4].should.eql ({ put: 6, get: 6 });
            res[5].should.equal (0);
            q.nConsumers().should.equal (0);

            done ();
          });
        });

        it ('pauses ok new consumers if queue paused, resumes them allright', done => {
          var q = factory.queue('_test_1_queue_', {});

          async.series ([
            cb => q._stats.clear (cb),
            cb => {q.pause (true); cb ();},

            cb => async.parallel ([
              cb => setTimeout (() => q.pop ('me', cb), 100),
              cb => setTimeout (() => q.push ({q:0, a: 'ryetyeryre 0'}, cb), 1000),
              cb => setTimeout (() => {q.pause (false); cb ();}, 2000),
            ], cb),

            cb => setTimeout (cb, 1000),

            cb => q.stats(cb),
            cb => q.size (cb),

            cb => q._stats.clear (cb),
          ], (err, res) => {
            if (err) return done (err);
            res[4].should.eql ({ put: 1, get: 1 });
            res[5].should.equal (0);
            q.nConsumers().should.equal (0);

            done ();
          });
        });

        it ('consumer with timeout times out ok if queue was paused', done => {
          var q = factory.queue('_test_2_queue_', {});

          async.series ([
            cb => q._stats.clear (cb),
            cb => {q.pause (true); cb ();},

            cb => async.parallel ([
              cb => setTimeout (() => q.pop ('me', {timeout: 2000}, err => cb (null, err)), 100),
              cb => setTimeout (() => q.push ({q:0, a: 'ryetyeryre 0'}, cb), 200),
            ], cb),

            cb => setTimeout (cb, 1000),

            cb => q.stats((err, res) => {
              if (err) return cb (err);
              cb (null, _.cloneDeep (res))
            }),
            cb => q.size (cb),

            cb => {q.pause (false); cb ();},
            cb => q.pop ('me', cb),

            cb => q._stats.clear (cb)
          ], (err, res) => {
            if (err) return done (err);
            res[4].should.eql ({ put: 1 });
            res[5].should.equal (1);
            res[2][0].timeout.should.eql (true);
            res[7].payload.should.eql ({q:0, a: 'ryetyeryre 0'});

            q.nConsumers().should.equal (0);

            done ();
          });
        });

        it ('consumer with timeout times out ok if queue is paused while waiting for delayed item', done => {
          var q = factory.queue('_test_3_queue_', {});

          async.series ([
            cb => q._stats.clear (cb),
            cb => q.push ({q:0, a: 'ryetyeryre 0'}, {delay: 3}, cb),
            cb => {q.pause (true); cb ();},
            cb => setTimeout (cb, 100),

            cb => q.pop ('me', {timeout: 1000}, err => cb (null, err)),

            cb => setTimeout (cb, 1000),

            cb => q.stats((err, res) => {
              if (err) return cb (err);
              cb (null, _.cloneDeep (res))
            }),
            cb => q.totalSize (cb),

            cb => {q.pause (false); cb ();},
            cb => q.pop ('me', cb),

            cb => q._stats.clear (cb)
          ], (err, res) => {
            if (err) return done (err);
            res[6].should.eql ({ put: 1 });
            res[7].should.equal (1);
            res[4].timeout.should.eql (true);
            res[9].payload.should.eql ({q:0, a: 'ryetyeryre 0'});

            q.nConsumers().should.equal (0);

            done ();
          });
        });

      });
    });
  });
});

