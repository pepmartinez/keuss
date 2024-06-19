// mongodb: create a consumer and a producer
const MQ = require ('../backends/pl-mongo');
const PLL = require ('../Pipeline/DirectLink');
const async = require ('async');


const factory_opts = {
  url: 'mongodb://localhost/qeus'
};

// initialize factory
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);

  // factory ready, create 3 queues on default pipeline
  const q_opts = {};

  async.parallel ({
    q1: cb => factory.queue ('test_pl_1', q_opts, cb),
    q2: cb => factory.queue ('test_pl_2', q_opts, cb),
    q3: cb => factory.queue ('test_pl_3', q_opts, cb),
  }, (err, qs) => {
    if (err) return console.error (err);

    // tie them up, q1 -> q2 -> q3 -> q1
    const pll1 = new PLL (qs.q1, qs.q2, {delay: 1});
    const pll2 = new PLL (qs.q2, qs.q3);
    const pll3 = new PLL (qs.q3, qs.q1);

    pll1.start (function (elem, done) {
      const pl = elem.payload;

      if (!pl.processed_1) {
        pl.processed_1=1
      }
      else {
        pl.processed_1++
      }

      console.log ('%s: tick', pll1.name ());
      done();
    });

    pll2.start (function (elem, done) {
      const pl = elem.payload;

      if (!pl.processed_2) {
        pl.processed_2=1
      }
      else {
        pl.processed_2++
      }

      console.log ('%s: tick', pll2.name ());
      done();
    });

    pll3.start (function (elem, done) {
      const pl = elem.payload;

      if (!pl.processed_3) {
        pl.processed_3=1
      }
      else {
        pl.processed_3++
      }

      console.log ('%s: tick', pll3.name ());
      done ();
    });

    // insert elements
    async.timesLimit (111, 3, (n, next) => {
      qs.q1.push ({a:n, b:'see it spin...'}, {}, next);
    });
  });
});
