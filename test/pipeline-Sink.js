
var async =   require ('async');
var should =  require ('should');

var LocalSignal = require ('../signal/local');
var MemStats =    require ('../stats/mem');

var PDL = require ('../Pipeline/DirectLink');
var PS  = require ('../Pipeline/Sink');

const MongoClient = require ('mongodb').MongoClient;

var factory = null;

[
  {label: 'Pipelined MongoDB',  mq: require ('../backends/pl-mongo')}
].forEach (function (MQ_item) {
  describe ('Pipeline/Sink operations over ' + MQ_item.label, function () {
    var MQ = MQ_item.mq;

    before (done => {
      var opts = {
        url: 'mongodb://localhost/__test_pipeline_sink__',
        opts:  { useUnifiedTopology: true },
        signaller: { provider: LocalSignal},
        stats: {provider: MemStats}
      };

      MQ (opts, (err, fct) => {
        if (err) return done (err);
        factory = fct;
        done();
      });
    });

    after (done => async.series ([
      cb => setTimeout (cb, 1000),
      cb => factory.close (cb),
      cb => MongoClient.connect ('mongodb://localhost/__test_pipeline_sink__', (err, cl) => {
        if (err) return done (err);
        cl.db().dropDatabase (() => cl.close (cb))
      })
    ], done));


    it ('3-elem pipeline flows begin to end, sink at the end', done => {
      var q_opts = {};
      var q1 = factory.queue ('test_1_pl_1', q_opts);
      var q2 = factory.queue ('test_1_pl_2', q_opts);
      var q3 = factory.queue ('test_1_pl_3', q_opts);

      // tie them up, q1 -> q2 -> q3 -> sink
      var pll1 = new PDL (q1, q2);
      var pll2 = new PDL (q2, q3);
      var snk1 = new PS  (q3);

      pll1.start ((elem, done0) => {
        elem.should.match ({
          payload: { a: 5, b: 'see it run...' },
          tries: 0,
          _q: 'test_1_pl_1'
        });

        done0();
      });

      pll2.start ((elem, done0) => {
        elem.should.match ({
          payload: { a: 5, b: 'see it run...' },
          tries: 0,
          _q: 'test_1_pl_2'
        });

        done0();
      });

      snk1.start ((elem, done0) => {
        elem.should.match ({
          payload: { a: 5, b: 'see it run...' },
          tries: 0,
          _q: 'test_1_pl_3'
        });

        done0();

        setTimeout (() => {
          pll1.stop();
          pll2.stop();
          snk1.stop();

          async.series ([
            cb => q1.totalSize(cb),
            cb => q2.totalSize(cb),
            cb => q3.totalSize(cb)
          ], (err, res) => {
            if (err) return done (err);
            res.should.eql ([0,0,0]);
            done ();
          });
        }, 500);
      });

      q1.push ({a:5, b:'see it run...'}, {}, () => {});
    });


    it ('3-elem pipeline flows begin to end, sink at the end, with sink retries', done => {
      var q_opts = {};
      var q1 = factory.queue ('test_1_pl_1', q_opts);
      var q2 = factory.queue ('test_1_pl_2', q_opts);
      var q3 = factory.queue ('test_1_pl_3', q_opts);

      // tie them up, q1 -> q2 -> q3 -> sink
      var pll1 = new PDL (q1, q2);
      var pll2 = new PDL (q2, q3);
      var snk1 = new PS  (q3);

      var try_count = 0;

      pll1.start ((elem, done0) => {
        elem.should.match ({
          payload: { a: 5, b: 'see it run...' },
          tries: 0,
          _q: 'test_1_pl_1'
        });

        done0();
      });

      pll2.start ((elem, done0) => {
        elem.should.match ({
          payload: { a: 5, b: 'see it run...' },
          tries: 0,
          _q: 'test_1_pl_2'
        });

        done0();
      });

      snk1.start ((elem, done0) => {
        if (try_count < 2) {
          try_count++;
          return done0 ({e: 'error, retry'});
        }

        elem.should.match ({
          payload: { a: 5, b: 'see it run...' },
          tries: 2,
          _q: 'test_1_pl_3'
        });

        done0();

        setTimeout (() => {
          pll1.stop();
          pll2.stop();
          snk1.stop();

          async.series ([
            cb => q1.totalSize(cb),
            cb => q2.totalSize(cb),
            cb => q3.totalSize(cb)
          ], (err, res) => {
            if (err) return done (err);
            res.should.eql ([0,0,0]);
            done ();
          });
        }, 500);
      });

      q1.push ({a:5, b:'see it run...'}, {}, () => {});
    });

  });
});
