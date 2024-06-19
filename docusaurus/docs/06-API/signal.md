---
id: signal
title: Signaller API
sidebar_label: Signaller
---
## Signaler factory

Signaller factory is passed to queues either in queue creation or in backend init, inside *opts.signaller*. Note that the result for the *new* operation is indeed the factory; the result of the `require` is therefore a *metafactory*.

```javascript
const signal_redis_pubsub = require ('keuss/signal/redis-pubsub');

const local_redis_opts = {
  Redis: {
    port: 6379,
    host: 'localhost',
    db: 6
  }
};

const f_opts = {
  signaller: {
    provider: signal_redis_pubsub,
    opts: local_redis_opts
  }
  .
  .
  .
}

MQ (f_opts, (err, factory) => {
  // queues created by factory here will use a redis pubsub signaller, hosted at redis at localhost, db 6
})
```

:::note
The signaller has no public api *per se*; it is considered just a piece of infrastructure to glue queues together.
:::
