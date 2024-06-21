const MQ = require ('../backends/pl-mongo');
const PLL = require ('../Pipeline/DirectLink');
const async = require ('async');


const factory_opts = {
  url: 'mongodb://localhost/qeus'
};

// initialize factory
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);

  // factory ready, create 2 queues on default pipeline
  const q_opts = {};
  async.parallel ({
    q1: cb => factory.queue ('test_pl_1', q_opts, cb),
    q2: cb => factory.queue ('test_pl_2', q_opts, cb),
  }, (err, qs) => {
    if (err) return console.error (err);

    // tie them up, q1 -> q2
    const pll = new PLL (qs.q1, qs.q2);

    pll.start (function (elem, done) {
      const pl = elem.payload;
      pl.pll_processed = true;
      done();
    });

    // insert elements in the entry queue
    async.timesLimit (111, 3, (n, next) => {
      qs.q1.push ({a:n, b:'see it spin...'}, {}, next);
    });

    async.timesLimit (111, 3, (n, next) => {
      qs.q2.pop ('exit', {}, (err, res) => {
        console.log ('end point get', res);
        next ();
      });
    });
  });
});

