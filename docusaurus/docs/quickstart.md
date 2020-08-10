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
```javascript
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
```
This small test creates a queue named `test_queue` backed by mongodb in the mongoDB collection at `mongodb://localhost/keuss_test`. Then, a single element is first inserted in the queue, then read from it and printed

## reserve-commit-rollback
```javascript
const async = require ('async');
const MQ =    require ('keuss/backends/mongo');

MQ ({
  url: 'mongodb://localhost/keuss_test'
}, (err, factory) => {
  if (err) return console.error(err);

  // factory ready, create one queue
  const q = factory.queue ('test_queue', {});

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
```
1. an element is inserted
2. an element is reserved. IT resenrves the element previously inserted, and returns it
3. this should print the element reserved
4. the element reserved is rejected, indicating that it should not be made available until `now + 1500` millisecs
5. a second attempt at a reserve, this should return an element after 1500 millisecs
6. the same element should be printed here, except for the `tries` that should be `1` instead of `0`
7. the element is committed and thus removed from the queue
