
const async =   require ('async');
const should =  require ('should');

const LocalSignal = require ('../signal/local');
const MemStats =    require ('../stats/mem');

const PDL = require ('../Pipeline/DirectLink');
const PS  = require ('../Pipeline/Sink');

const MongoClient = require ('mongodb').MongoClient;


process.on('unhandledRejection', (err, p) => {
  console.error('unhandledRejection', err.stack, p)
});

let factory = null;


[
  {label: 'Pipelined MongoDB',  mq: require ('../backends/pl-mongo')}
].forEach (MQ_item => {
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe ('Pipeline/Sink operations over ' + MQ_item.label, () => {
    const MQ = MQ_item.mq;

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    after (done => async.series ([
      cb => setTimeout (cb, 1000),
      cb => factory.close (cb),
      cb => MongoClient.connect ('mongodb://localhost/__test_pipeline_sink__', (err, cl) => {
        if (err) return done (err);
        cl.db().dropDatabase (() => cl.close (cb))
      })
    ], done));


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it ('3-elem pipeline flows begin to end, sink at the end', done => {
      const q_opts = {};

      async.parallel ({
        q1: cb => factory.queue ('test_1_pl_1', q_opts, cb),
        q2: cb => factory.queue ('test_1_pl_2', q_opts, cb),
        q3: cb => factory.queue ('test_1_pl_3', q_opts, cb),
      }, (err, qs) => {
        if (err) return done(err);
            
        // tie them up, q1 -> q2 -> q3 -> sink
        const pll1 = new PDL (qs.q1, qs.q2);
        const pll2 = new PDL (qs.q2, qs.q3);
        const snk1 = new PS  (qs.q3);

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
              cb => qs.q1.totalSize(cb),
              cb => qs.q2.totalSize(cb),
              cb => qs.q3.totalSize(cb)
            ], (err, res) => {
              if (err) return done (err);
              res.should.eql ([0,0,0]);
              done ();
            });
          }, 500);
        });

        qs.q1.push ({a:5, b:'see it run...'}, {}, () => {});
      });
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it ('3-elem pipeline flows begin to end, sink at the end, with sink retries', done => {
      const q_opts = {};

      async.parallel ({
        q1: cb => factory.queue ('test_1_pl_1', q_opts, cb),
        q2: cb => factory.queue ('test_1_pl_2', q_opts, cb),
        q3: cb => factory.queue ('test_1_pl_3', q_opts, cb),
      }, (err, qs) => {
        if (err) return done(err);

        // tie them up, q1 -> q2 -> q3 -> sink
        const pll1 = new PDL (qs.q1, qs.q2);
        const pll2 = new PDL (qs.q2, qs.q3);
        const snk1 = new PS  (qs.q3);

        let try_count = 0;

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
              cb => qs.q1.totalSize(cb),
              cb => qs.q2.totalSize(cb),
              cb => qs.q3.totalSize(cb)
            ], (err, res) => {
              if (err) return done (err);
              res.should.eql ([0,0,0]);
              done ();
            });
          }, 500);
        });

        qs.q1.push ({a:5, b:'see it run...'}, {}, () => {});
      });
    });

  });
});
