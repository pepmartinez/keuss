---
id: putting-all-together
title: Putting all together
sidebar_label: Putting all together
---

## Factory initialization

First, choose a factory, also known as backend:

```javascript
const MQ = require ('../../backends/mongo');
```

Then, simply execute the backend, passing the config, to obtain a working factory:

```javascript
MQ ({
  url: 'mongodb://localhost/keuss_test'
}, (err, factory) => {
  if (err) return console.error(err);

  // factory is ready to be used

}
```

You can create and use as many factories as desided, from the same or many backends

## Queue creation

You use the factory to create queues:

```javascript
const q1 = factory.queue ('test_queue_1', {});
const q2 = factory.queue ('test_queue_2', {});
```

A queue can be created more than once with the same name, inside the same factory (this is a common procedure when consumer and producer are separated). The effect would be virtually the same as sharing the queue:

```javascript
const q_consumer = factory.queue ('test_queue', {});
const q_producer = factory.queue ('test_queue', {});
```

## Put elements in queue (push)

putting elements in a queue is simple enough:

```javascript
const elem = {
  elem: 1,
  headline: 'something something',
  tags: {
    a: 1,
    b: 2
  }
};

q1.push (elem, (err, res) => {
  // push finished, either with error or success...
}),
```

## Get elements from queue (pop)

The easiest way to get elements from a queue is with a simple pop(). This would block until an element is ready, it would remove it from the queue and return it.

This way of working is often referred to as *at-most-once* since it guarantees that each element in the queue will be processed no more than one time (it would be zero times, if something happens after `pop()` ands but before the element is actually managed)

```javascript
const consumer_label = 'consumer-1';
q1.pop (consumer_label, (err, res) => {
  if (err) return console.error (err);

  console.log (res);
      // this should print something like:
      // {
      //   _id: <some id>,
      //   mature: <some date>,
      //   payload: { elem: 1, headline: 'something something', tags: { a: 1, b: 2 } },
      //   tries: 0
      // }
      //
      // that is, the actual element is at res.payload
}
```

## Reserve-commit-rollback

A safer way to consume from a queue is using reserve: elements are reserved, processed and only then committed (and removed from the queue). A reserved element can also be rolled back (returned to queue) if the processing failed and the element needs to be reprocessed in the future; also, any reserved element will auto-rollback after some tiem elapsed, if neither commit nor rollback is done. This is known as *at-least-once* cause it guarantees all elements wold be processed at least once

```javascript
const consumer_label = 'consumer-1';
q1.pop (consumer_label, {reserve: true}, (err, elem) => {
  if (err) return console.error (err);

  // res is ready to be processed
  do_some_processing (elem.payload, err => {
    if (err) {
      // error, rollback so it gets retried, adding a delay
      const next_t = new Date().getTime () + 15000;
      q1.ko (item, next_t, () = >{
        // the element is returned to queue, but it won't be available until 15 secs have passed
      });
    }
    else {
      // processing went fine, commit element
      q1.ok (item, () => {
        // the element is removed from the queue
      });
    }
  });
}
```

## Termination

Once all is done, you can free all the resources associated to the factory by closing it:

```javascript
factory.close (err => {
  // factory is now closed and cannot be used anymore
});
```

Once a factory is closed it cannot be used, *and all the queues created through it will becomes unusable too*
