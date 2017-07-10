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


function run_consumer (q) {
  q.pop ('c1', {}, function (err, res) {
//    logger.verbose ('consumer: got err %j', err, {});
//    logger.verbose ('consumer: got res %j', res, {});

//    setTimeout (function () {
      run_consumer (q);
//    }, random.from0to (2000) + 100);
  });
}

function run_producer (q) {
  q.push ({a:1, b:'666'}, function (err, res) {
//    logger.verbose ('producer: got err %j', err, {});
//    logger.verbose ('producer: got res %j', res, {});

//    setTimeout (function () {
      run_producer (q);
//    }, (random.from0to (10) + 5) * 1000);
  });
}


var MQ = require ('../backends/redis-oq');
var redis_signaller = require ('../signal/redis-pubsub');
var redis_stats = require ('../stats/redis');

var opts = {
  logger: logger,
  signaller: {
    provider: new redis_signaller ()
  },
  stats: {
    provider: new redis_stats ()
  }
};
    
MQ (opts, function (err, factory) {
  if (err) {
    return logger.error (err);
  }

  var q0 = factory.queue('bench_test_queue_0', opts);
  run_consumer (q0);
  run_producer (q0);

  var q1 = factory.queue('bench_test_queue_1', opts);
  run_consumer (q1);
//  run_producer (q1);

  var q2 = factory.queue('bench_test_queue_2', opts);
  run_consumer (q2);
//  run_producer (q2);

  var q3 = factory.queue('bench_test_queue_3', opts);
  run_consumer (q3);
//  run_producer (q3);
});
