var async =   require ('async');
var should =  require ('should');
var winston = require ('winston');
var random = require('random-to');


var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: 'verbose',
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
    logger.verbose ('consumer: got err %j', err, {});
    logger.verbose ('consumer: got res %j', res, {});

    setTimeout (function () {
      run_consumer (q);
    }, random.from0to (2000) + 100);
  });
}

function run_producer (q) {
  q.push ({a:1, b:'666'}, function (err, res) {
    logger.verbose ('producer: got err %j', err, {});
    logger.verbose ('producer: got res %j', res, {});

    setTimeout (function () {
      run_producer (q);
    }, (random.from0to (30) + 100) * 1000);
  });
}


var MQ = require ('../backends/redis-oq');

var opts = {
  logger: logger
};
    
MQ (opts, function (err, factory) {
  if (err) {
    return logger.error (err);
  }

  var q = factory.queue('test_queue', opts);

  run_consumer (q);
  run_producer (q);
});
