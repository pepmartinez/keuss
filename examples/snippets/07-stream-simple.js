/*
 *
 * very simple example of stream-mongo: one element pushed, consumed three times
 *
 */

const async = require ('async');
const MQ =    require ('../../backends/stream-mongo');

// initialize factory
MQ ({
  url: 'mongodb://localhost/keuss_test_stream'
}, (err, factory) => {
  if (err) return console.error(err);

  // factory ready, create one queue
  async.parallel ({
    q0: cb => factory.queue ('test_stream', {groups: 'G1, G2, G4'}, cb),
    q1: cb => factory.queue ('test_stream', {group: 'G1'}, cb),
    q2: cb => factory.queue ('test_stream', {group: 'G2'}, cb),
  }, (err, qs) => {
    if (err) return console.error(err);

    async.series ([
      // push element
      cb => qs.q0.push (
        {elem: 1, headline: 'something something', tags: {a: 1, b: 2}}, // this is the payload
        {
          hdrs: {h1: 'aaa', h2: 12, h3: false}  // let's add some headers too
        },
        cb
      ),
      cb => setTimeout (cb, 1000),  // wait a bit
      cb => qs.q1.pop ('consumer-1', cb), // pop element in group G1
      cb => qs.q2.pop ('consumer-2', cb), // pop element in group G2
    ], (err, res) => {
      if (err) return console.error (err);

      console.log ('element popped for group G1:', res[2]);
      console.log ('element popped for group G2:', res[3]);
      // this should print twice something like:
      // {
      //   _id: <some id>,
      //   mature: <some date>,
      //   payload: { elem: 1, headline: 'something something', tags: { a: 1, b: 2 } },
      //   tries: 0
      //   hdrs: {h1: 'aaa', h2: 12, h3: false}
      // }
      
      factory.close ();
    });
  });
});

