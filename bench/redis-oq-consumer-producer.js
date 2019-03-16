var async =  require ('async');
var should = require ('should');
var Chance = require ('chance');

var chance = new Chance();

function run_consumer (q) {
  q.pop ('c1', {}, function (err, res) {
    console.log ('consumer: got err %j', err, {});
    console.log ('consumer: got res %j', res, {});

//    setTimeout (function () {
      run_consumer (q);
//    }, chance.integer({ min: 200, max: 2000 }));
  });
}

function run_producer (q) {
  q.push ({a:1, b:'666'}, function (err, res) {
    console.log ('producer: got err %j', err, {});
    console.log ('producer: got res %j', res, {});

    setTimeout (function () {
      run_producer (q);
    }, (random.from0to (10) + 1) * 1000);
  });
}


var MQ = require ('../backends/redis-oq');
var redis_signaller = require ('../signal/redis-pubsub');
var redis_stats = require ('../stats/redis');

var opts = {
  signaller: {
    provider: new redis_signaller ()
  },
  stats: {
    provider: new redis_stats ()
  }
};
    
MQ (opts, function (err, factory) {
  if (err) {
    return logger.error (err);
  }

  var q = factory.queue('bench_test_queue', opts);

  run_consumer (q);
  run_producer (q);
});
