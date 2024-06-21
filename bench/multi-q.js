const async =  require ('async');
const should = require ('should');
const Chance = require ('chance');

let produced = 0;
let consumed = 0;

const chance = new Chance();


// choice of backend
const MQ = require (
  //  '../backends/bucket-mongo-safe'
  //  '../backends/redis-oq'
  // '../backends/redis-list'
  '../backends/mongo'
  //  '../backends/ps-mongo'
  //  '../backends/pl-mongo'
  );

const redis_signaller = require ('../signal/redis-pubsub');
const redis_stats =     require ('../stats/redis');
    
const factory_opts = {
  signaller: {
    provider: redis_signaller,
  },
  stats: {
    provider: redis_stats,
  }
};


MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);
    
  function run_consumer (q) {
    q.pop ('c1', {}, (err, res) => {
  //    console.log ('consumer[%s]: got res %j', q.name(), res, {});
      consumed++;

      if (consumed > 1000000) {
        factory.close ();
      }
      else {
        if (!(consumed % 10000)) console.log ('< %d', consumed)
  //    setTimeout (function () {
        run_consumer (q);
  //    }, chance.integer({ min: 200, max: 2000 }));
      }
    });
  }

  function run_producer (q) {
    q.push ({a:1, b:'666'}, (err, res) => {
      produced++;

      if (produced > 1000000) {
        
      }
      else {
        if (!(produced % 10000)) console.log ('> %d', produced)
  //    setTimeout (function () {
        run_producer (q);
  //    }, chance.integer({ min: 200, max: 2000 }));
      }
    });
  }

  factory.queue('bench_test_queue_0', (err, q0) => {
    if (err) return console.error (err);
    run_consumer (q0);
    run_producer (q0);
  });
/*
  factory.queue('bench_test_queue_1', (err, q1) => {
    if (err) return console.error (err);
    run_consumer (q1);
    run_producer (q1);
  });

  factory.queue('bench_test_queue_0', (err, q2) => {
    if (err) return console.error (err);
    run_consumer (q2);
    run_producer (q2);
  });

  factory.queue('bench_test_queue_0', (err, q3) => {
    if (err) return console.error (err);
    run_consumer (q3);
    run_producer (q3);
  });
*/
});
