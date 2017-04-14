var async =   require ('async');
var should =  require ('should');
var winston = require ('winston');
var random = require('random-to');


var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: 'info',
      timestamp: function() {return new Date ();},
      formatter: function (options) {
        // Return string will be passed to logger. 
        return options.timestamp().toISOString() +' '+ options.level.toUpperCase() +' '+ (options.message ? options.message : '') +
        (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
      }
    })
  ]
});

var counter = 0;

function run_producer (q) {
  q.push ({a:1, b:'666'}, function (err, res) {
    logger.verbose ('producer: got err %j', err, {});
    logger.verbose ('producer: got res %j', res, {});

    counter++;
    logger.info ('producer: got %d', counter);
    setTimeout (function () {
      run_producer (q);
    }, 10);
  });
}


var MQ = require ('../backends/redis-oq');

var opts = {
  logger: logger
};
    
MQ.init (opts, function (err) {
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

  var q = new MQ('test_queue', q_opts);

  run_producer (q);
});
