
var async = require ('async');

var MQ = require('../backends/mongo');
//var signal_mongo_capped = require('../signal/mongo-capped');
var signal_mongo_capped = require('../signal/local');
var stats_mongo = require('../stats/mongo');


var factory_opts = {
  url: 'mongodb://localhost/qeus',
  signaller: {
    provider: signal_mongo_capped,
    opts: {
      url: 'mongodb://localhost/qeus_signal',
      channel: 'das_channel'
    }
  },
  stats: {
    provider: stats_mongo,
    opts: {
      url: 'mongodb://localhost/qeus_stats'
    }
  }
};


// initialize factory
MQ(factory_opts, (err, factory) => {
  if (err) {
    return console.error(err);
  }

  var consumed = 0;
  var produced = 0;

  function run_consumer(q) {
    q.pop('c1', {}, (err, res) => {
//      console.log('consumer[%s]: got res %j', q.name(), res, {});
      consumed++;

      if (consumed > 100) {
        factory.close();
      } else {
        if (!(consumed % 10)) console.log('< %d', consumed);

        setTimeout(function () {
          run_consumer(q);
        }, 222);
      }
    });
  }

  function run_producer(q) {
    q.push({
      a: 1,
      b: '666',
      t: new Date(),
      n: produced
    }, (err, res) => {
      produced++;

      if (produced > 3) {

      } else {
        if (!(produced % 10)) console.log('> %d', produced);

        setTimeout(function () {
          run_producer(q);
        }, 33);
      }
    });
  }

  var opts = {};

  var q = factory.queue('bench_test_queue_0', opts);
//  run_consumer(q);
//  run_producer(q);

  async.series ([
    cb => q.push ({q:0, a: 'ryetyeryre 0'}, cb),
    cb => q.push ({q:1, a: 'ryetyeryre 1'}, cb),
    cb => q.pop ('me', (err, res) => {console.log ('>>>>>>> POP c0:', res); cb ();}),
    cb => q.pop ('me', (err, res) => {console.log ('>>>>>>> POP c1:', res); cb ();}),

    cb => {
      q.pop ('me', (err, res) => console.log ('>>>>>>> POP c2:', res));
      q.pop ('me', (err, res) => console.log ('>>>>>>> POP c3:', res));
      q.pop ('me', (err, res) => console.log ('>>>>>>> POP c4:', res));
      q.pop ('me', (err, res) => console.log ('>>>>>>> POP c5:', res));
      q.pop ('me', (err, res) => console.log ('>>>>>>> POP c6:', res));
      cb ();
    },
    cb => setTimeout (cb, 2000),
    cb => {q.pause(true); cb ();},
    cb => q.push ({q:2, a: 'ryetyeryre 2'}, cb),
    cb => q.push ({q:3, a: 'ryetyeryre 3'}, cb),
    cb => q.push ({q:4, a: 'ryetyeryre 4'}, cb),
    cb => q.push ({q:5, a: 'ryetyeryre 5'}, cb),
    cb => setTimeout (cb, 2000),
    cb => {q.pause(false); cb ();},
    cb => setTimeout (cb, 2000),
  ], () => {
    q.cancel();
    factory.close();
  });
});
