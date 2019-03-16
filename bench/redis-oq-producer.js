var async =  require ('async');
var should = require ('should');

var counter = 0;

function run_producer (q) {
  q.push ({a:1, b:'666'}, function (err, res) {
    console.log ('producer: got err %j', err, {});
    console.log('producer: got res %j', res, {});

    counter++;
    console.log('producer: got %d', counter);
    setTimeout (function () {
      run_producer (q);
    }, 333);
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

  run_producer (q);
});
