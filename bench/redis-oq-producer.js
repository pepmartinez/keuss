const async =  require ('async');

let counter = 0;

function run_producer (q) {
  q.push ({a:1, b:'666'}, (err, res) => {
    console.log ('producer: got err %j', err, {});
    console.log('producer: got res %j', res, {});

    counter++;
    console.log('producer: got %d', counter);
    setTimeout (() => run_producer (q), 333);
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
    run_producer (q);
  });
});
