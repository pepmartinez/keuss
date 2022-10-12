---
id: factory
title: Factory API
sidebar_label: Factory
---

Backends, which work as queue factories, have the following operations:

## `MQ`: Factory initialization

```javascript
var QM = require ('keuss/backends/<backend>');

MQ (opts, (err, factory) => {
  // factory contains the actual factory, initialized
})
```

where `opts` is an object containing initialization options. Common properties to all backends are:

* `name`: Name for the factory, defaults to 'N'.
* `reserve_delay`: number of seconds to keep 'reserved' status after a reserve operation. Defaults to 120.
* `stats`:
  * `provider`: stats backend to use, as result of `require ('keuss/stats/<provider>')`. Defaults to `require ('keuss/stats/mem')`.
  * `opts`: options for the provider.
* `signaller`:
  * `provider`: signaller provider to use, as result of `require ('keuss/signal/<provider>')`. Defaults to `require ('keuss/signal/local')`.
  * `opts`: options for the provider.
* `deadletter`: deadletter options, described below.
  * `max_ko`: max rollbacks per element.
  * `queue`: deadletter queue name.

The following are backend-dependent values:

* backends *mongo*, *pl-mongo* and *ps-mongo*
  * `url`: mongodb url to use, defaults to `mongodb://localhost:27017/keuss`.
* backends *redis-list* and *redis-oq*
  * `redis`: data to create a redis connection to the Redis acting as backend, see below.
* backends *ps-mongo*, *stream-mongo*
  * `ttl`: time to keep consumed elements in the collection after being removed. Defauls to 3600 secs.
* backend *stream-mongo*
  * `groups`: string, comma-separated list of possible consumer groups to be used on push operations. Defaults to `A,B,C`
  * `group`: string, consumer group to be used on pop/reserve operations. Defaults to first element of `groups`

### MongoDB defaults

On MongoDB-based backends, `signaller` and `stats` defaults to:

* `signaller`: uses `mongo-capped`, using the same mongodb url than the backend, but postfixing the db with `_signal`.
* `stats`: uses `mongo-capped`, using the same mongodb url than the backend, but postfixing the db with `_stats`.
This alows cleaner and more concise initialization, using a sane default.

### Dead Letter

The concept of *deadletter* is very common on queue middlewares: in case reserve/commit/rollback is used to consume, a maximum number of fails (reserve-rollback) can be set on each element; if an element sees more rollbacks than allowed, the element is moved to an special queue (dead letter queue) for later, offline inspection.

By default, keuss uses no deadletter queue; it can be activated by passing a `deadletter` object at the time of factory creation, in the options:

```javascript
var factory_opts = {
  url: 'mongodb://localhost/qeus',
  deadletter: {
    max_ko: 3
  }
};

// initialize factory
MQ(factory_opts, (err, factory) => {
  ...
```

This object must not be empty, and can contain the following keys:

* `max_ko`: maximum number of rollbacks per element allowed. The next rollback will cause the element to be moved to the deadletter queue. Defaults to 0, which means `infinite`.
* `queue`: queue name of the deadletter queue, defaults to `__deadletter__`.

:::tip
All storage backends support deadletter. In `ps-mongo` the move-to-deadletter (as it is the case with other move-to-queue operations) is atomic; in the rest, the element is first committed in the original queue and then pushed inside deadletter.
:::

When an element is moved to deadletter, the original headers are kept, and others are added:
* `x-dl-from-queue`: name of the queue the message was in
* `x-dl-t`: ISO timestamp of the move-to-deadletter operation
* `x-dl-tries`: number of tries at the moment of move-to-deadletter

## `queue`: Queue creation

```javascript
// factory has been initialized
var q = factory.queue (<name>, <options>);
```

Where:

* `name`: string to be used as queue name. Queues with the same name are in fact the same queue if they're backed in the same factory type using the same initialization data (mongodb url or redis conn-data).
* `options`: the options passed at backend initialization are used as default values:
  * `pollInterval`: rearm or poll period in millisecs for get operations, defaults to 15000 (see [Working with no signallers](../usage/no-signaller)).
  * `reserve_delay`: number of seconds to keep 'reserved' status after a reserve operation. Defaults to 120.
  * `signaller`: signaller to use for the queue.
    * `provider`: signaller factory.
    * `opts`: options for the signaller factory (see [Signaler](signal)).
  * `stats`: stats store to use for this queue.
    * `provider`: stats factory.
    * `opts`: options for the stats factory (see below).

## `close`: Factory close

```javascript
factory.close (err => {...});
```

Frees up resources on the factory. Queues created with the factory will become unusable afterwards. See ['Shutdown process'](/docs/usage/shutdown) for more info.
