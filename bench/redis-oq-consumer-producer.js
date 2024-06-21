const async =  require ('async');
const Chance = require ('chance');

const chance = new Chance();

function run_consumer (q) {
  q.pop ('c1', {}, (err, res) => {
    console.log ('consumer: got err %j', err, {});
    console.log ('consumer: got res %j', res, {});

//    setTimeout (() =>
      run_consumer (q);
//    , chance.integer({ min: 200, max: 2000 }));
  });
}

function run_producer (q) {
  q.push ({a:1, b:'666'}, (err, res) => {
    console.log ('producer: got err %j', err, {});
    console.log ('producer: got res %j', res, {});

    setTimeout (() => run_producer (q), chance.integer ({max: 3000}));
  });
}

const MQ = require ('../backends/redis-oq');
const redis_signaller = require ('../signal/redis-pubsub');
const redis_stats = require ('../stats/redis');

const opts = {
  signaller: {
    provider: redis_signaller
  },
  stats: {
    provider: redis_stats
  }
};
    
MQ (opts, (err, factory) => {
  if (err) return logger.error (err);

  factory.queue('bench_test_queue', opts, (err, q) => {
    run_consumer (q);
    run_producer (q);
  });
});
