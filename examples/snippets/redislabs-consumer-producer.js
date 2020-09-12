// redis-list consumer & producer on a redislabs Redis

var MQ = require('../../backends/redis-list');

var factory_opts = {
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
MQ(factory_opts, function (err, factory) {
  if (err) {
    return console.error(err);
  }

  // factory ready, create one queue
  var q_opts = {};
  var q = factory.queue('test_queue', q_opts);

  // insert element
  q.push({ a: 1, b: '666' }, function (err, res) {
    if (err) {
      return console.error(err);
    }

    // element inserted at this point. pop it again
    var pop_opts = {};
    q.pop('consumer-one', pop_opts, function (err, res) {
      if (err) {
        return console.error(err);
      }

      console.log('got this: ', res.payload);
    });
  });

});
