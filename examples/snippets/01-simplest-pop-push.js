const async = require ('async');
const MQ =    require ('keuss/backends/mongo');

MQ ({
  url: 'mongodb://localhost/keuss_test'
}, (err, factory) => {
  if (err) return console.error(err);

  // factory ready, create one queue
  const q = factory.queue ('test_queue', {});

  async.series([
    cb => q.push ({elem: 1, headline: 'something something', tags: {a: 1, b: 2}}, cb),
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
      // }
    }

    factory.close ();
  });
});

