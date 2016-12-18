
var stats_redis = require ('./stats/redis');
var stats_mem =   require ('./stats/mem');

var signal_redis_pubsub = require ('./signal/redis-pubsub');
var signal_local =        require ('./signal/local');

var winston = require ('winston');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({level: 'verbose'})
  ]
});

var config = {
  logger: logger,
  queues: {
    logger: logger,
    pollInterval: 17000,
    stats: {
      provider: stats_redis,
      opts: {}
    },
    signaller: {
      provider: signal_redis_pubsub,
      opts: {}
    }
  },
  backends: [
    {
      factory: 'mongo',
//      disable: true,
      config: {
        url: 'mongodb://localhost:27017/jobq'
      }
    },
    {
      factory: 'redis-list',
    },
    {
      factory: 'redis-oq',
    }
  ]
};

module.exports = config;
