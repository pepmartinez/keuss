// mongodb: create a consumer and a producer, use redis signaller and redis stats
const MQ = require ('../backends/mongo');
const signal_redis_pubsub = require ('../signal/redis-pubsub');
const stats_redis = require ('../stats/redis');

const local_redis_opts = {
  Redis: {
    port: 6379,
    host: 'localhost',
    db: 6
  }
};

const factory_opts = {
  url: 'mongodb://localhost/qeus',
  signaller: {
    provider: signal_redis_pubsub,
    opts: local_redis_opts
  },
  stats: {
    provider: stats_redis,
    opts: local_redis_opts
  }
};
    
// initialize factory 
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);

  // factory ready, create one queue
  const q_opts = {};
  factory.queue ('test_queue_123', q_opts, (err, q) => {
    if (err) return console.error(err);

    // insert element
    q.push ({a:1, b:'666'}, (err, res) => {
      if (err) return console.error (err);

      // element inserted at this point. pop it again
      const pop_opts = {};
      q.pop ('consumer-one', pop_opts, (err, res) => {
        if (err) return console.error (err);
        console.log ('got this: ', res.payload);
      });
    });
  });
});