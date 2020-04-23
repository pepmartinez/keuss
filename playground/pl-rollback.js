// mongodb: create a consumer and a producer
var MQ =    require ('../backends/pl-mongo');
var DL =    require ('../Pipeline/DirectLink');
var async = require ('async');


var factory_opts = {
  url: 'mongodb://localhost/qeus-pl'
};

// initialize factory
MQ (factory_opts, function (err, factory) {
  if (err) {
    return console.error (err);
  }

  // factory ready, create 3 queues on default pipeline
  var q_opts = {};
  var q1 = factory.queue ('test_pl_r_1', q_opts);
  var q2 = factory.queue ('test_pl_r_2', q_opts);

  // tie them up, q1 -> q2
  var pll = new DL (q1, q2);

  pll.start ((elem, done) => {
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

  q1.push ({a:5, b:'see it fail...'}, {}, function () {});
});
