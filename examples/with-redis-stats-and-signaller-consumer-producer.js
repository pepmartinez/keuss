// mongodb: create a consumer and a producer, use redis signaller and redis stats
var MQ = require ('../backends/mongo');
var signal_redis_pubsub = require ('../signal/redis-pubsub');
var stats_redis = require ('../stats/redis');

var local_redis_opts = {
  Redis: {
    port: 6379,
    host: 'localhost',
    db: 6
  }
};

var factory_opts = {
  url: 'mongodb://localhost/qeus',
  signaller: {
    provider: new signal_redis_pubsub (local_redis_opts)
  },
  stats: {
    provider: new stats_redis (local_redis_opts)
  }
};
    
// initialize factory 
MQ (factory_opts, function (err, factory) {
  if (err) {
    return console.error (err);
  }

  // factory ready, create one queue
  var q_opts = {};
  var q = factory.queue ('test_queue_123', q_opts);

  // insert element
  q.push ({a:1, b:'666'}, function (err, res) {
    if (err) {
      return console.error (err);
    }

    // element inserted at this point. pop it again
    var pop_opts = {};
    q.pop ('consumer-one', pop_opts, function (err, res) {
      if (err) {
        return console.error (err);
      }

      console.log ('got this: ', res.payload);
    });
  });
});