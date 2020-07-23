
var async =   require ('async');
var should =  require ('should');

var LocalSignal = require ('../signal/local');
var MemStats =    require ('../stats/mem');


const MongoClient = require ('mongodb').MongoClient;

const bs_src_array = [
  `
  const Chance = require ('chance');
  const chance = new Chance();
  `,
  `
  function get_a_delay (min, max) {
    return chance.integer ({min, max});
  }
  `,
  `
  function sink_process (elem, done) {
    setTimeout (() => {
      done();

      state.processed++;
      if (state.processed == num_elems) {
        setTimeout (() => process.exit (0), 1000);
      }

    }, get_a_delay (10, 20));
  }

  function dl_process (elem, done) {
    // pass element to next queue, set payload.passed to true
    done (null, {
      update: {
        $set: {stamp_0: 'passed'}
      }
    });
  }

  function choice_process (elem, done) {
    setTimeout (() => {
      if (chance.bool ({likelihood: 7})) {
        return done ({e: 'cl1 induced a failure'});
      }

      const idx = chance.pickone([0, 1, 2]);

      done (null, {
        dst: idx,
        update: {
          $set: {stamp_1: 'passed', choice: idx, choice_try: elem.tries}
        }
      });
    }, get_a_delay (10, 20));
  }
  `
];

const setup_src_array = [
  `
  const q_opts = {};

  builder
  .queue ('test_pl_1', q_opts)
  .queue ('test_pl_2', q_opts)
  .queue ('test_pl_3', q_opts)
  .queue ('test_pl_4', q_opts)
  .queue ('test_pl_5', q_opts)
  .directLink ('test_pl_1', 'test_pl_2', dl_process)
  .choiceLink ('test_pl_2', ['test_pl_3', 'test_pl_4', 'test_pl_5'], choice_process)
  .sink ('test_pl_3', sink_process)
  .sink ('test_pl_4', sink_process)
  .sink ('test_pl_5', sink_process)
  .onError ((err) => {})
  .done (done);
  `
];


function loop (n, fn, cb) {
  if (n == 0) return cb ();
  fn (n, err => {
    if (err) return cb (err);
    setImmediate (() => loop (n-1, fn, cb));
  });
}

var factory = null;

[
  {label: 'Pipelined MongoDB',  mq: require ('../backends/pl-mongo')}
].forEach (function (MQ_item) {
  describe ('Pipeline/Builder operations over ' + MQ_item.label, function () {
    var MQ = MQ_item.mq;

    before (done => {
      var opts = {
        url: 'mongodb://localhost/__test_pipeline_builder__',
        opts:  { useUnifiedTopology: true },
        signaller: {provider: LocalSignal},
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
      cb => MongoClient.connect ('mongodb://localhost/__test_pipeline_builder__', (err, cl) => {
        if (err) return done (err);
        cl.db().dropDatabase (() => cl.close (cb))
      })
    ], done));


    it ('constructs, runs and destructs a pipeline ok', done => {
      let pipeline = null;

      function pl_exit (code) {
        pipeline.stop ();
        context.state.should.eql ({processed: 7});
        done ();
      }

      let context = {
        state: {
          processed: 0
        },
        num_elems: 7,
        process: {
          exit: pl_exit
        }
      };

      factory.pipelineFromRecipe ('__test_pipeline_builder_1__', bs_src_array, setup_src_array, {context: context}, (err, pl) => {
        if (err) return done (err);
        pipeline = pl;

        pl.start ();

        loop (
          context.num_elems,
          (n, next) => setTimeout (() => pl.queues()['test_pl_1'].push ({a:n, b:'see it fail...'}, next), 10),
          err => {
            if (err) done (err);
          }
        );
      });
    });

    it ('catches error events in processors', done => {
      const bs_src_array_local = [
        `
        const Chance = require ('chance');
        const chance = new Chance();
        `,
        `
        function get_a_delay (min, max) {
          return chance.integer ({min, max});
        }
        `,
        `
        function sink_process (elem, done) {
          setTimeout (() => {
            done();

            state.processed++;
            if (state.processed == num_elems) {
              setTimeout (() => process.exit (0), 1000);
            }

          }, get_a_delay (10, 20));
        }

        function dl_process (elem, done) {
          // pass element to next queue, set payload.passed to true
          done (null, {
            update: {
              $set: {stamp_0: 'passed'}
            }
          });
        }

        function choice_process (elem, done) {
          setTimeout (() => {
            if (chance.bool ({likelihood: 7})) {
              return done ({e: 'cl1 induced a failure'});
            }

            const idx = 66;

            done (null, {
              dst: idx,
              update: {
                $set: {stamp_1: 'passed', choice: idx, choice_try: elem.tries}
              }
            });
          }, get_a_delay (10, 20));
        }
        `
      ];

      const setup_src_array_local = [
        `
        const q_opts = {};

        builder
        .queue ('test_pl_1', q_opts)
        .queue ('test_pl_2', q_opts)
        .queue ('test_pl_3', q_opts)
        .queue ('test_pl_4', q_opts)
        .queue ('test_pl_5', q_opts)
        .directLink ('test_pl_1', 'test_pl_2', dl_process)
        .choiceLink ('test_pl_2', ['test_pl_3', 'test_pl_4', 'test_pl_5'], choice_process)
        .sink ('test_pl_3', sink_process)
        .sink ('test_pl_4', sink_process)
        .sink ('test_pl_5', sink_process)
        .onError (on_error)
        .done (done);
        `
      ];

      let pipeline;

      function on_error (err) {
        err.on.should.equal ('next-queue');
        err.err.e.should.equal ('ill-specified dst queue [66]');
        err.processor.name().should.equal ('test_pl_2->{test_pl_3,test_pl_4,test_pl_5}');
        pipeline.stop ();
        done ();
      }

      factory.pipelineFromRecipe ('__test_pipeline_builder_2__', bs_src_array_local, setup_src_array_local, {context: {on_error}}, (err, pl) => {
        if (err) done (err);
        pipeline = pl;
        pl.start ();
        pl.queues()['test_pl_1'].push ({a:887, b:'see it fail...'}, () => {});
      });
    });


    it ('catches errors in js BS scripts on initialization', done => {
      const bs_src_array_local =  [
        'aaaa()'
      ];

      factory.pipelineFromRecipe ('__test_pipeline_builder_2__', bs_src_array_local, setup_src_array, {context: {}}, (err, pl) => {
        err.message.should.equal ('aaaa is not defined');
        done ();
      });
    });


    it ('catches errors in js setup scripts on initialization', done => {
      const setup_src_array_local = [
        `
        const q_opts = {};

        builder
        .queue ('test_pl_1', q_opts)
        .queue ('test_pl_2', q_opts)
        .directLink ('test_pl_1', 'test_pl_3', dl_process)
        .onError ((err) => {})
        .done (done);
        `
      ];

      factory.pipelineFromRecipe ('__test_pipeline_builder_3__', bs_src_array, setup_src_array_local, {context: {}}, (err, pl) => {
        err.should.equal ('when creating DirectLink: nonexistent dst queue [test_pl_3]')
        done ();
      });
    });

    it ('propagates to a second pipeline instance');

  });
});
