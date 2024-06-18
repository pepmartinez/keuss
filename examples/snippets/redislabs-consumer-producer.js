// redis-list consumer & producer on a redislabs Redis

const MQ = require('../../backends/redis-list');

const factory_opts = {
  redis: {
    Redis: {
      port: 12345,
      host: 'redis-12345.c3.eu-west-1-2.ec2.cloud.redislabs.com',
      family: 4,
      password: 'xxxxxxxx',
      db: 0
    }
  }
};

// initialize factory 
MQ(factory_opts, (err, factory) => {
  if (err) return console.error(err);

  // factory ready, create one queue
  const q_opts = {};
  factory.queue ('test_queue', q_opts, (err, q) => {
    if (err) return console.error(err);

    // insert element
    q.push({ a: 1, b: '666' }, (err, res) => {
      if (err) return console.error(err);

      // element inserted at this point. pop it again
      const pop_opts = {};
      q.pop('consumer-one', pop_opts, (err, res) => {
        if (err) return console.error(err);
        console.log('got this: ', res.payload);
      });
    });
  });
});
