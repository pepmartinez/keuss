---
id: quickstart
title: Quickstart
sidebar_label: Quickstart
---

## Package Install

`keuss` is installed in the regular way for any npm package:

```bash
npm install keuss
```

## Basic usage (with regular MongoDB backend)

Here's a minimal example of how keuss works. [async](https://www.npmjs.com/package/async) is used to implement asynchronous flows in a much readable manner

```javascript
const async = require ('async');
const MQ =    require ('keuss/backends/mongo');

MQ ({
  url: 'mongodb://localhost/keuss_test'
}, (err, factory) => {
  if (err) return console.error(err);

  // factory ready, create one queue
  factory.queue ('test_queue', (err, q) => {
    if (err) return console.error(err);

    async.series([
      cb => q.push (
        {elem: 1, headline: 'something something', tags: {a: 1, b: 2}}, // this is the payload
        {
          hdrs: {h1: 'aaa', h2: 12, h3: false}  // let's add some headers too
        },
        cb
      ),
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
        //   tries: 0,
        //   hdrs: {h1: 'aaa', h2: 12, h3: false}
        // }
      }

      factory.close ();
    });
  });
});
```

This small test creates a queue named `test_queue` backed by mongodb in the mongoDB collection at `mongodb://localhost/keuss_test`. Then, a single element is first inserted in the queue, then read from it and printed

## Backend interchangeability

This example works with any available definition of `MQ`; you just need to specify the chosen backend. For example, to use the `redis-list` backend:

```js
const MQ = require ('keuss/backends/redis-list');
```

## reserve-commit-rollback

```javascript
const async = require ('async');
const MQ =    require ('keuss/backends/mongo');

MQ ({
  url: 'mongodb://localhost/keuss_test'
}, (err, factory) => {
  if (err) return console.error(err);

  // factory ready, create one queue
  factory.queue ('test_queue', (err, q) => {
    if (err) return console.error(err);

    async.waterfall ([
      cb => q.push ({elem: 1, headline: 'something something', tags: {a: 1, b: 2}}, cb),  // (1)
      (item_id, cb) => q.pop ('consumer-1', {reserve: true}, cb),                         // (2)
      (item, cb) => {
        console.log ('%s: got %o', new Date().toString (), item);                         // (3)
        const next_t = new Date().getTime () + 1500;
        q.ko (item, next_t, cb);                                                          // (4)
      },
      (ko_res, cb) => q.pop ('consumer-1', {reserve: true}, cb),                          // (5)
      (item, cb) => {
        console.log ('%s: got %o', new Date().toString (), item);                         // (6)
        q.ok (item, cb);                                                                  // (7)
      },
    ], (err, res) => {
      if (err) console.error (err);
      factory.close ();
    });
  });
});
```

1. An element is inserted.
2. An element is reserved. It reserves the element previously inserted, and returns it.
3. This should print the element reserved.
4. The element reserved is rejected, indicating that it should not be made available until `now + 1500` millisecs.
5. A second attempt at a reserve, this should return an element after 1500 millisecs.
6. The same element should be printed here, except for the `tries` that should be `1` instead of `0`.
7. The element is committed and thus removed from the queue.

## Backend interchangeability

This example works with any definition of `MQ` that supports reserve/commit (that is, any except `redis-list`); you just need to specify the chosen backend. For example, to use the `bucket-mongo-safe` backend:

```js
const MQ = require ('keuss/backends/bucket-mongo-safe');
```

## Full producer and consumer loops

This is a more convoluted example: a set of producers inserting messages, and another set of consumers consumig them, all in parallel. The queue stats (elements pushed, elements popped) are shown every second.

Try and change the uncommented `const MQ = require('keuss/backends/...');`  to see the performance differences between backends.

Also, notice that, when, running with any mongodb-based backend, stats figures are cumulative across different executions: if you run it several times, you'll see the stats' figures also include data from previous executions.

```js
const async = require ('async');

// choice of backend
const MQ = require (
  'keuss/backends/bucket-mongo-safe'
//   'keuss/backends/redis-oq'
//   'keuss/backends/mongo'
//   'keuss/backends/ps-mongo'
);

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
      // producers' loop
      cb => async.timesLimit (msgs, producers, (n, next) => {
        q.push ({elem: n, headline: 'something something', tags: {a: 1, b: 2}}, next);
      }, err => {
        console.log ('producer loop ended');
        cb (err);
      }),
      // consumers' loop
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
```
