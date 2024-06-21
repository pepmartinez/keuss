const async =  require ('async');
const should = require ('should');
const Chance = require ('chance');

var LocalSignal = require ('../signal/local');
var MemStats =    require ('../stats/mem');

const MongoClient = require('mongodb').MongoClient;

const CHC = require ('../Pipeline/ChoiceLink');
const SNK = require ('../Pipeline/Sink');

const chance = new Chance();
var factory = null;


process.on('unhandledRejection', (err, p) => {
  console.error('unhandledRejection', err.stack, p)
})

function loop (n, fn, cb) {
  if (n == 0) return cb ();
  fn (n, err => {
    if (err) return cb (err);
    setImmediate (() => loop (n-1, fn, cb));
  });
}

[
  {label: 'Pipelined MongoDB',  mq: require ('../backends/pl-mongo')}
].forEach (MQ_item => {
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe ('Pipeline/ChoiceLink operations over ' + MQ_item.label, () => {
    const MQ = MQ_item.mq;

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    before (done => {
      const opts = {
        url: 'mongodb://localhost/__test_pipeline_choicelink__',
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
      cb => MongoClient.connect ('mongodb://localhost/__test_pipeline_choicelink__', (err, cl) => {
        if (err) return done (err);
        cl.db().dropDatabase (() => cl.close (cb))
      })
    ], done));

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it ('3-elem choice pipeline distributes ok', done => {
      const score = {
        total: 17,
        next_idx: 0,
        received: {
          total: 0
        }
      };

      const q_opts = {pipeline: 'pl1'};

      async.parallel ({
        q1: cb => factory.queue ('pl_many_q_1', q_opts, cb),
        q2: cb => factory.queue ('pl_many_q_2', q_opts, cb),
        q3: cb => factory.queue ('pl_many_q_3', q_opts, cb),
        q4: cb => factory.queue ('pl_many_q_4', q_opts, cb),
      }, (err, qs) => {
        if (err) return done(err);

        // tie them up:
        const cl1 = new CHC (qs.q1, [qs.q2, qs.q3, qs.q4]);
        const sk1 = new SNK (qs.q2);
        const sk2 = new SNK (qs.q3);
        const sk3 = new SNK (qs.q4);

        cl1.dst_dimension().should.equal(3);
        cl1.dst_names().should.eql (['pl_many_q_2', 'pl_many_q_3', 'pl_many_q_4']);

        function sink_process (elem, done0) {
          score.received.total++;
          if (!score.received[this.name()]) score.received[this.name()] = [];
          score.received[this.name()].push (elem.payload.a);

          if (score.received.total == score.total) {
            setTimeout (() => {
              score.should.eql ({
                total: 17,
                next_idx: 2,
                received: {
                  total: 17,
                  'pl_many_q_2->(sink)': [ 17, 14, 11, 8, 5, 2 ],
                  'pl_many_q_3->(sink)': [ 16, 13, 10, 7, 4, 1 ],
                  'pl_many_q_4->(sink)': [ 15, 12, 9, 6, 3 ]
                }
              });

              setTimeout (done, 250);
            }, 100);
          }

          done0();
        }

        sk1.start (sink_process);
        sk2.start (sink_process);
        sk3.start (sink_process);

        cl1.start (function (elem, done) {
          const idx = score.next_idx++;
          if (score.next_idx > 2) score.next_idx = 0;

          done (null, {
            dst: idx,
            update: {
              $set: {stamp: 'passed', choice: idx}
            }
          });
        });

        loop (
          score.total,
          (n, next) => setTimeout (() => qs.q1.push ({a:n, b:'see it fail...'}, next), chance.integer ({min:50, max: 100})),
          err => {
            if (err) done (err);
          }
        );
      });
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it ('manages non-index correctly', done => {
      const q_opts = {pipeline: 'pl2'};

      async.parallel ({
        q1: cb => factory.queue ('pl_many_q_1', q_opts, cb),
        q2: cb => factory.queue ('pl_many_q_2', q_opts, cb),
        q3: cb => factory.queue ('pl_many_q_3', q_opts, cb),
        q4: cb => factory.queue ('pl_many_q_4', q_opts, cb),
      }, (err, qs) => {
        if (err) return done(err);
          
        // tie them up:
        const cl1 = new CHC (qs.q1, [qs.q2, qs.q3, qs.q4]);
        const sk1 = new SNK (qs.q2);
        const sk2 = new SNK (qs.q3);
        const sk3 = new SNK (qs.q4);

        function sink_process (elem, done0) {
          done0();
        }

        sk1.start (sink_process);
        sk2.start (sink_process);
        sk3.start (sink_process);

        cl1.on ('error', err => {
          err.should.match ({
            on: 'next-queue',
            elem: {
              payload: { a: 666, b: 'see it fail...' },
              tries: 0,
              _q: 'pl_many_q_1'
            },
            opts: { dst: 6 },
            err: { e: 'ill-specified dst queue [6]' }
          });

          sk1.stop ();
          sk2.stop ();
          sk3.stop ();

          setTimeout (() => {
            const client = new MongoClient('mongodb://localhost/__test_pipeline_choicelink__');
            client.connect(err => {
              client.db().collection ('pl2').deleteMany ({}, () => done ());
            });
          }, 250);
        });

        cl1.start (function (elem, done) {
          done (null, {dst: 6});
        });

        qs.q1.push ({a:666, b:'see it fail...'}, () => {});
      });
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it ('manages non-name correctly', done => {
      const q_opts = {pipeline: 'pl3'};

      async.parallel ({
        q1: cb => factory.queue ('pl_many_q_1', q_opts, cb),
        q2: cb => factory.queue ('pl_many_q_2', q_opts, cb),
        q3: cb => factory.queue ('pl_many_q_3', q_opts, cb),
        q4: cb => factory.queue ('pl_many_q_4', q_opts, cb),
      }, (err, qs) => {
        if (err) return done(err);

        // tie them up:
        const cl1 = new CHC (qs.q1, [qs.q2, qs.q3, qs.q4]);
        const sk1 = new SNK (qs.q2);
        const sk2 = new SNK (qs.q3);
        const sk3 = new SNK (qs.q4);

        function sink_process (elem, done0) {
          done0();
        }

        sk1.start (sink_process);
        sk2.start (sink_process);
        sk3.start (sink_process);

        cl1.on ('error', err => {
          err.should.match ({
            on: 'next-queue',
            elem: {
              payload: { a: 666, b: 'see it fail...' },
              tries: 0,
              _q: 'pl_many_q_1'
            },
            opts: { dst: 'nowhere' },
            err: { e: 'ill-specified dst queue [nowhere]' }
          });

          sk1.stop ();
          sk2.stop ();
          sk3.stop ();

          setTimeout (() => {
            const client = new MongoClient('mongodb://localhost/__test_pipeline_choicelink__');
            client.connect(err => {
              client.db().collection ('pl3').deleteMany ({}, () => done ());
            });
          }, 250);
        });

        cl1.start (function (elem, done) {
          done (null, {dst: 'nowhere'});
        });

        qs.q1.push ({a:666, b:'see it fail...'}, () => {});
      });
    });
  });
});
