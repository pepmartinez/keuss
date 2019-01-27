var async =   require ('async');
var program = require ('commander');

 program
  .version ('0.0.1')
  .usage   ('[options]')
  .option  ('-q, --queue', 'act on this queue')
  .option  ('-i, --info', 'get info about queue')
  .option  ('-c, --consumer', 'run consumer loop')
  .option  ('-C, --consumer-num <n>', 'consume n elements, -1 for infinite', parseInt)
  .option  ('-p, --producer', 'run producer loop')
  .option  ('-P, --producer-num <n>', 'produce n elements, -1 for infinite', parseInt)
  .option  ('-d, --producer-delay <n>', 'produce with a delay of n secs', parseInt)
  .option  ('-D, --dump-produced', 'dump text of produced messages on log')
  .option  ('-b, --backend <value>', 'use queue backend. defaults to \'mongo\'')
  .option  ('-s, --signaller <value>', 'use signaller backend. defaults to \'local\'')
  .option  ('-t, --stats <value>', 'use stats backend. defaults to \'mem\'')
  .parse   (process.argv);

var MQ = require ('../backends/' + (program.backend || 'mongo'));


/////////////////////////////////////////
function info (q, cb) {
  async.parallel ({
    size:         (cb) => {q.size (cb)},
    totalSize:    (cb) => {q.totalSize (cb)},
    schedSize:    (cb) => {q.schedSize (cb)},
    next_t:       (cb) => {q.next_t (cb)},
    stats:        (cb) => {q.stats (cb)},
    topology:     (cb) => {q.topology (cb)},
    name:         (cb) => {cb (null, q.name())},
    ns:           (cb) => {cb (null, q.ns())},
    type:         (cb) => {cb (null, q.type())},
    capabilities: (cb) => {cb (null, q.capabilities())},
  }, cb);
}


/////////////////////////////////////////
function consume_loop (q, n, cb) {
  if (n == 0) return cb ();
  
  q.pop ('consumer', function (err, res) {
    if (err) return cb (err);    
    if (program.dumpProduced) {
      console.log ('%j', res, {});
    }
    else if (program.verbose) {
      console.log ('consume_loop: get %j', res, {});
    }
    
    if (n == null) {
      consume_loop (q, null, cb);
    }
    else {
      consume_loop (q, (n ? n - 1 : n), cb);
    }
  });
}


/////////////////////////////////////////
function produce_loop (q, n, cb) {   
  if (n == 0) return cb ();
  
  var opts = {};
  if (program.producerDelay) {
    opts.delay = program.producerDelay;
  }
  
  q.push ({elem:44, tt:{a:1, b:'2'}}, opts, function (err, res) {
    if (err) return cb (err);
    
    if (program.verbose) {
      console.log ('produce_loop: put %s', res, {}); 
    }
  
    if (n == null) {
      produce_loop (q, null, cb);
    }
    else {
      produce_loop (q, (n ? n - 1 : n), cb);
    }
  });
}



var q_opts = {};
  
console.log (`MQ.init: using backend ${program.backend || 'mongo'}`);

if (program.signaller) {
  var signal_provider = require ('../signal/' + program.signaller);
  q_opts.signaller = {
    provider: signal_provider
  }

  console.log (`MQ.init: using signeller ${program.signaller}`);
}
  
if (program.stats) {
  var stats_provider = require ('../stats/' + program.stats);
  q_opts.stats = {
    provider: stats_provider
  }

  console.log (`MQ.init: using stats ${program.stats}`);
}


MQ (q_opts, function (err, factory) {
  if (err) return console.error ('MQ.init: %s', err, {});
  
  console.log ('MQ.init: backend initiated');
  
  var q = factory.queue (program.queue || 'test', {});

  var tasks = [];
  
  if (program.info) {
    tasks.push (function (cb) {
      info (q, function (err, res) {
        if (err) {
          console.error (err);
        }
        else {
          console.log (res);
        }

        cb ();
      });
    })
  }

  if (program.consumer) {
    tasks.push (function (cb) {
      console.log ('MQ.init: initiating consume loop');
      consume_loop (q, program.consumerNum, cb);
    });
  }
  
  if (program.producer) {
    tasks.push (function (cb) {
      console.log ('MQ.init: initiating produce loop');
      produce_loop (q, program.producerNum, cb);
    });
  }

  async.parallel (tasks, function (err) {
    if (err) {
      console.error (err);
    }
    else {
      console.log (`all done`);

      factory.close();
    }
  })
});
