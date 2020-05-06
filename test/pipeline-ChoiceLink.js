var async =  require ('async');
var should = require ('should');
var Chance = require ('chance');

var CHC = require ('../Pipeline/ChoiceLink');
var SNK  = require ('../Pipeline/Sink');

var chance = new Chance();
var factory = null;


function loop (n, fn, cb) {
  if (n == 0) return cb ();
  fn (n, err => {
    if (err) return cb (err);
    setImmediate (() => loop (n-1, fn, cb));
  });
}

[
  {label: 'Pipelined MongoDB',  mq: require ('../backends/pl-mongo')}
].forEach (function (MQ_item) {
  describe ('Pipeline/ChoiceLink operations over ' + MQ_item.label, function () {
    var MQ = MQ_item.mq;

    before (done => {
      var opts = {
        url: 'mongodb://localhost/__test_pipeline_choicelink__'
      };

      MQ (opts, (err, fct) => {
        if (err) return done (err);
        factory = fct;
        done();
      });
    });

    after (done => async.series ([
      cb => setTimeout (cb, 1000),
      cb => factory.close (cb)
    ], done));


    it ('3-elem choice pipeline distributes ok', done => {
      var score = {
        total: 17,
        next_idx: 0,
        received: {
          total: 0
        }
      };

      var q_opts = {};

      var q1 = factory.queue ('pl_many_q_1', q_opts);
      var q2 = factory.queue ('pl_many_q_2', q_opts);
      var q3 = factory.queue ('pl_many_q_3', q_opts);
      var q4 = factory.queue ('pl_many_q_4', q_opts);

      // tie them up:
      var cl1 = new CHC (q1, [q2, q3, q4]);
      var sk1 = new SNK (q2);
      var sk2 = new SNK (q3);
      var sk3 = new SNK (q4);

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

            done ();
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
        (n, next) => setTimeout (() => q1.push ({a:n, b:'see it fail...'}, next), chance.integer ({min:50, max: 100})),
        err => {
          if (err) done (err);
        }
      );
    });

  });
});