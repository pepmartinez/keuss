var async =  require ('async');
var should = require ('should');
var random = require ('random-to');

var counter = 0;

function run_consumer (q) {
  q.pop ('c1', {}, function (err, res) {
    console.log ('consumer: got err %j', err, {});
    console.log ('consumer: got res %j', res, {});

    counter++;
    logger.info ('consumer: got %d', counter);
    run_consumer (q);
  });
}

var MQ = require ('../backends/redis-oq');

var opts = {
};
    
MQ (opts, function (err, factory) {
  if (err) {
    return logger.error (err);
  }

  var q_opts = {
    logger: logger,
    signaller: {
      provider: require ('../signal/redis-pubsub')
    },
    stats: {
      provider: require ('../stats/redis')
    }
  };

  var q = factory.queue ('test_queue', q_opts);

  run_consumer (q);
});
