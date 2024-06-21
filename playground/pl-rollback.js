// mongodb: create a consumer and a producer
const MQ =    require ('../backends/pl-mongo');
const DL =    require ('../Pipeline/DirectLink');
const async = require ('async');


const factory_opts = {
  url: 'mongodb://localhost/qeus-pl'
};

// initialize factory
MQ (factory_opts, function (err, factory) {
  if (err) {
    return console.error (err);
  }

  // factory ready, create 3 queues on default pipeline
  const q_opts = {};

  async.parallel ({
    q1: cb => factory.queue ('test_pl_r_1', q_opts, cb),
    q2: cb => factory.queue ('test_pl_r_2', q_opts, cb),
  }, (err, qs) => {

    // tie them up, q1 -> q2
    const pll = new DL (qs.q1, qs.q2);

    pll.start (function (elem, done) {
      console.log (this.name());

      if (elem.tries < 1) {
        console.log ('%d: nope, try %d', elem.payload.a, elem.tries)
        done ({e: 'error, retry'});
      }
      else {
        console.log ('%d: alles klar, try %d', elem.payload.a, elem.tries);

        const update = {
          $set: {
            alfa: 666*elem.tries,
            stage: `stage-${elem.tries}`
          },
          $inc: {
            'counters.alpha': 2,
            'counters.beta': 1,
          }
        };

        done (null, {update});
      }
    });

    // insert elements
  //  async.timesLimit (111, 3, (n, next) => {
  //    setTimeout (() => q1.push ({a:n, b:'see it fail...'}, {}, next), 1111);
  //  });

    qs.q1.push ({a:5, b:'see it fail...'}, {}, () => {});
  });
});
