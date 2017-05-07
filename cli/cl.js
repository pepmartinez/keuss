var winston = require ('winston');
var program = require ('commander');

program
  .version ('0.0.1')
  .usage   ('[options]')
  .option  ('-c, --consumer', 'run consumer loop')
  .option  ('-C, --consumer-num <n>', 'consume n elements', parseInt)
  .option  ('-p, --producer', 'run producer loop')
  .option  ('-P, --producer-num <n>', 'produce n elements', parseInt)
  .option  ('-d, --producer-delay <n>', 'produce with a delay of n secs', parseInt)
  .option  ('-D, --dump-produced', 'dump text of produced messages on log')
  .option  ('-b, --backend <value>', 'use queue backend. defaults to \'mongo\'')
  .option  ('-s, --signaller <value>', 'use signaller backend. defaults to \'local\'')
  .option  ('-t, --stats <value>', 'use stats backend. defaults to \'mem\'')
  .option  ('-v, --verbose', 'verbose log')
  .option  ('-l, --log [value]', 'use logfile, defaults to stderr/console')
  .parse   (process.argv);

var logger = undefined;

if (program.log) {
  logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ 
        filename: program.log, 
        level: (program.verbose ? 'verbose' : 'info'),
        maxsize:1024*1024*10,
        maxFiles: 5,
        handleExceptions: true,
        humanReadableUnhandledException: true,
        json: false
      })
    ]
  });
}
else {
  logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        level: (program.verbose ? 'verbose' : 'info')
      })
    ]
  });
}

var MQ = require ('../backends/' + (program.backend || 'mongo'));

var get_hrtime = process.hrtime();
var put_hrtime = process.hrtime();


function consume_loop (q, n) {
  if (n == 0) {
    return;
  }
  
  q.pop ('consumer', function (err, res) {
    if (err) {
      logger.error ('consume_loop: get err --> %s', err, {});
    }
    
    if (program.dumpProduced) {
      logger.info ('%j', res, {});
    }
    else if (program.verbose) {
      logger.verbose ('consume_loop: get %j', res, {});
    }
    
    if (((n - 1) % 1000) == 0) {
      var diff = process.hrtime (get_hrtime);
      var elapsed = (diff[0] * 1e9 + diff[1]) / 1e6;
      logger.info ('consume_loop: get remaining %d, elapsed %d', n - 1, elapsed);
      get_hrtime = process.hrtime ();
    }
    
    consume_loop (q, (n ? n - 1 : n));
  });
}


function produce_loop (q, n) {   
  if (n == 0) {
    return;
  }
  
  var opts = {};
  if (program.producerDelay) {
    opts.delay = program.producerDelay;
  }
  
  q.push ({elem:44, tt:{a:1, b:'2'}}, opts, function (err, res) {
    if (err) {
      logger.error ('produce_loop: put err --> %s', err, {});
    }
    
    if (program.verbose) {
      logger.verbose ('produce_loop: put %s', res, {}); 
    }
    
    if (((n - 1) % 1000) == 0) {
      var diff = process.hrtime (put_hrtime);
      var elapsed = (diff[0] * 1e9 + diff[1]) / 1e6;
      logger.info ('produce_loop: put remaining: %d, elapsed %d', n - 1, elapsed);
      put_hrtime = process.hrtime ();
    }
  
    produce_loop (q, (n ? n - 1 : n));
  });
}


MQ ({logger: logger}, function (err, factory) {
  if (err) {
    return logger.error ('MQ.init: %s', err, {});
  }
  
  logger.verbose ('MQ.init: backend initiated');
  
  var q_opts = {
    logger: logger
  };
  
  if (program.verbose) {
    q_opts.level = 'verbose'
  }
  
  if (program.signaller) {
    var signal_provider = require ('../signal/' + program.signaller);
    q_opts.signaller = {
      provider: new signal_provider ()
    }
  }
  
  if (program.stats) {
    var stats_provider = require ('../stats/' + program.stats);
    q_opts.stats = {
      provider: new stats_provider ()
    }
  }
  
  logger.verbose ('MQ.init: creating queue with options %j', q_opts, {});
  
  var q = factory.queue ('test', q_opts);
  
  if (program.consumer) {
    logger.verbose ('MQ.init: initiating consume loop');
    consume_loop (q, program.consumerNum);
  }
  
  if (program.producer) {
    logger.verbose ('MQ.init: initiating produce loop');
    produce_loop (q, program.producerNum);
  }
});
