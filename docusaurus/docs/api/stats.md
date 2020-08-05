---
id: stats
title: Stats API
sidebar_label: Stats
---

Stats factory is passed to queues either in queue creation or in backend init, inside *opts.signaller*. Note that the result fo the *new* operation is indeed the factory; the result of the require is therefore a *metafactory*

```javascript
var local_redis_pubsub = require ('keuss/signal/redis-pubsub');

var local_redis_opts = {
  Redis: {
    port: 6379,
    host: 'localhost',
    db: 6
  }
};

var f_opts = {
  stats: {
    provider: signal_redis_pubsub,
    opts: local_redis_opts
  }
  .
  .
  .
}

MQ (f_opts, (err, factory) => {
  // queues created by factory here will use a redis-backed stats, hosted at redis at localhost, db 6
})
```
Stats objects, as of now, store the numer of elements inserted and the number of elements extracted; they are created behind the scenes and tied to queue instances, and the stats-related interface is in fact part of the queues' interface
