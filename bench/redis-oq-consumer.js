const async =  require ('async');

let counter = 0;

function run_consumer (q) {
  q.pop ('c1', {}, (err, res) => {
    console.log ('consumer: got err %j', err, {});
    console.log ('consumer: got res %j', res, {});

    counter++;
    logger.info ('consumer: got %d', counter);
    run_consumer (q);
  });
}

const MQ = require ('../backends/redis-oq');

const opts = {};
    
MQ (opts, (err, factory) => {
  if (err) return logger.error (err);

  const q_opts = {
    logger: logger,
    signaller: {
      provider: require ('../signal/redis-pubsub')
    },
    stats: {
      provider: require ('../stats/redis')
    }
  };

  factory.queue ('test_queue', q_opts, (err, q) => {
    if (err) return logger.error (err);
    run_consumer (q);
  });
});
