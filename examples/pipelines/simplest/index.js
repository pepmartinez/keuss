const async = require ('async');

const MQ = require    ('../../../backends/pl-mongo');
const PDL = require   ('../../../Pipeline/DirectLink');

const factory_opts = {
  url: 'mongodb://localhost/qeus'
};

// initialize factory
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);

  // factory ready, create 2 queues on default pipeline
  async.parallel ({
    q1: cb => factory.queue ('test_pl_1', cb),
    q2: cb => factory.queue ('test_pl_2', cb),
  }, (err, qs) => {
    if (err) return console.error (err);
    
    // tie them up, q1 -> q2
    const pdl = new PDL (qs.q1, qs.q2);

    pdl.start (function (elem, done) {
      // pass element to next queue, set payload.passed to true
      done (null, {
        update: {
          $set: {passed: true}
        }
      });
    });

    // insert elements in the entry queue
    async.timesLimit (3, 3, (n, next) => qs.q1.push ({a:n, b:'see it spin...'}, next));

    // read elements at the outer end
    async.timesLimit (3, 3, (n, next) => qs.q2.pop ('exit', (err, res) => {
      console.log ('end point get', res);
      next ();
    }));
  });
});
