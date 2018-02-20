var MQ = require ('../backends/pl-mongo');
var PLL = require ('../PipelineLink');
var async = require ('async');


var factory_opts = {
  url: 'mongodb://localhost/qeus'
};
    
// initialize factory 
MQ (factory_opts, function (err, factory) {
  if (err) {
    return console.error (err);
  }

  // factory ready, create 2 queues on default pipeline
  var q_opts = {};
  var q1 = factory.queue ('test_pl_1', q_opts);
  var q2 = factory.queue ('test_pl_2', q_opts);

  // tie them up, q1 -> q2
  var pll = new PLL (q1, q2);

  pll.start (function (elem, done) {
    var pl = elem.payload;
    pl.pll_processed = true;
    done();
  });

  // insert elements in the entry queue
  async.timesLimit (111, 3, function (n, next) {
    q1.push ({a:n, b:'see it spin...'}, {}, next);
  });

  async.timesLimit (111, 3, function (n, next) {
    q2.pop ('exit', {}, function (err, res) {
      console.log ('end point get', res);
      next ();
    });
  });
});

