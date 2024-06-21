/*
 * 
 * simplest-possible producer and consumer loops: a loop of parallel producers push N elements in a queue; 
 * another loop of parallel consumers pop the elements out of the queue 
 * 
 * Queue stats are also shown every second
 * 
 */
const async = require ('async');

// choice of backend
const MQ = require (
//  '../../backends/bucket-mongo-safe'
//  '../../backends/redis-oq'
  '../../backends/mongo'
//  '../../backends/ps-mongo'
);

// initialize factory
MQ ({
  url: 'mongodb://localhost/keuss_test'
}, (err, factory) => {
  if (err) return console.error(err);

  const consumers = 3;
  const producers = 3;
  const msgs = 100000;

  // factory ready, create one queue
  factory.queue ('test_queue', (err, q) => {
    if (err) return console.error(err);

    // show stats every sec
    const timer = setInterval (() => {
      q.stats ((err, res) => console.log ('  --> stats now: %o', res));
    }, 1000);

    async.parallel ([
      // producers' loop, with 'producers' parallel producers
      cb => async.timesLimit (msgs, producers, (n, next) => {
        q.push ({elem: n, headline: 'something something', tags: {a: 1, b: 2}}, next);
      }, err => {
        console.log ('producer loop ended');
        cb (err);
      }),
      // consumers' loop, with 'consumers' parallel consumers
      cb => async.timesLimit (msgs, consumers, (n, next) => {
        q.pop ('theconsumer', {reserve: true}, (err, item) => {
          if (err) return cb (err);
          q.ok (item, next);
        });
      }, err => {
        console.log ('consumer loop ended');
        cb (err);
      })
    ], err => {
      if (err) return console.error (err);

      clearInterval (timer);

      // all loops completed, cleanup & show stats
      async.series ([
        cb => q.drain (cb),
        cb => q.stats (cb),
        cb => setTimeout (cb, 1000),
        cb => q.stats (cb),
      ], (err, res) => {
        if (err) console.error (err);
        else {
          console.log ('stats right after drain: %o', res[1]);
          console.log ('stats once dust settled: %o', res[3]);
        }

        factory.close ();
      });
    });
  });
});

