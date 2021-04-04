/*
 *
 * very simple example of push & pop: an element is pushed, and then popped
 *
 */

const async = require ('async');
const MQ =    require ('../../backends/mongo');

// initialize factory
MQ ({
  url: 'mongodb://localhost/keuss_test'
}, (err, factory) => {
  if (err) return console.error(err);

  // factory ready, create one queue
  const q = factory.queue ('test_queue', {});

  async.series([
  // push element
    cb => q.push (
      {elem: 1, headline: 'something something', tags: {a: 1, b: 2}}, // this is the payload
      {
        hdrs: {h1: 'aaa', h2: 12, h3: false}  // let's add some headers too
      },
      cb
    ),
  // pop element
    cb => q.pop ('consumer-1', cb)
  ], (err, res) => {
    if (err) {
      console.error (err);
    }
    else {
      console.log (res[1]);
      // this should print something like:
      // {
      //   _id: <some id>,
      //   mature: <some date>,
      //   payload: { elem: 1, headline: 'something something', tags: { a: 1, b: 2 } },
      //   tries: 0
      //   hdrs: {h1: 'aaa', h2: 12, h3: false}
      // }
    }

    factory.close ();
  });
});

