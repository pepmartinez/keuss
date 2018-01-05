// mongodb: create a consumer and a producer
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

  // factory ready, create 3 queues on default pipeline
  var q_opts = {};
  var q1 = factory.queue ('test_pl_1', q_opts);
  var q2 = factory.queue ('test_pl_2', q_opts);
  var q3 = factory.queue ('test_pl_3', q_opts);

  // tie them up, q1 -> q2 -> q3 -> q1
  var pll1 = new PLL (q1, q2, {delay: 1});
  var pll2 = new PLL (q2, q3);
  var pll3 = new PLL (q3, q1);

  pll1.start (function (elem, done) {
    var pl = elem.payload;

    if (!pl.processed_1) {
      pl.processed_1=1
    } 
    else {
      pl.processed_1++
    }

    done();
  });

  pll2.start (function (elem, done) {
    var pl = elem.payload;

    if (!pl.processed_2) {
      pl.processed_2=1
    } 
    else {
      pl.processed_2++
    }
  
    done();
  });
  
  pll3.start (function (elem, done) {
    var pl = elem.payload;

    if (!pl.processed_3) {
      pl.processed_3=1
    } 
    else {
      pl.processed_3++
    }

    done ();
  });

  // insert elements
  async.timesLimit (1111, 3, function (n, next) {
    q1.push ({a:n, b:'see it spin...'}, {}, next);
  });
});