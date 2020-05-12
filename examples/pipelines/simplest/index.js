var MQ = require    ('../../../backends/pl-mongo');
var PDL = require   ('../../../Pipeline/DirectLink');
var async = require ('async');

var factory_opts = {
  url: 'mongodb://localhost/qeus'
};

// initialize factory
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);

  // factory ready, create 2 queues on default pipeline
  var q_opts = {};
  var q1 = factory.queue ('test_pl_1', q_opts);
  var q2 = factory.queue ('test_pl_2', q_opts);

  // tie them up, q1 -> q2
  var pdl = new PDL (q1, q2);

  pdl.start ((elem, done) => {
    // pass element to next queue, set payload.passed to true
    done (null, {
      update: {
        $set: {passed: true}
      }
    });
  });

  // insert elements in the entry queue
  async.timesLimit (111, 3, (n, next) => q1.push ({a:n, b:'see it spin...'}, next));

  // read elements at the outer end
  async.timesLimit (111, 3, (n, next) => q2.pop ('exit', (err, res) => {
    console.log ('end point get', res);
    next ();
  }));
});
