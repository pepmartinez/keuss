---
id: concepts
title: Concepts
sidebar_label: Concepts
---

# Queue
a **Queue** is more of an interface, a definition of what it can do. Keuss queues are capable of:
* insert one element
* schedule an element: insert one element with a not-before datetime
* get an element, and block for some specified time if no element is available
* reserve an element, and block for some specified time if no element is available
* commit (remove) or rollback (return back) a previously reserved element
* get element count
* get element count whose not-before datetime is in the future (scheduled elements)
* get usage stats: elements inserted, elements extracted

*element* here translates to any js object. Internally, it's usually managed as json

# Pipeline
A **pipeline** is an enhanced queue that provides an extra operation: pass an element to another queue **atomically**. In an scenario where processors are linked with queues, it is usually a good feature to allow the 'commit element in incoming queue, insert element in the next queue' to be atomic. This removes chances for race conditions, or message losses.

The pipeline concept is, indeed, an extension of the reserve-commit model; it is so far implemented only atop mongodb, and it is anyway considered as a 'low-level' feature, best used by means of specialized classes to encapsulate the aforementioned processors.

# Storage
**Storage** or **Backend** provides almost-complete queue primitives, fully functional and already usable as is. Keuss comes with 7 backends, with various levels of features and performance:

* *mongo*, a mongodb-based backend that provides the full set of queue features, still with decent performance.
* *redis-oq*, backed using an ordered queue on top of redis (made in turn with a sorted set, a hash and some lua). Provides all queue features including reserve-commit-rollback. Noticeable faster than mongodb.
* *redis-list*, backed using a redis list. Does not offer reserve-commit-rollback nor the ability to schedule, but is much faster than redis-oq
* *pl-mongo*, a version of the *mongo* backend that provides pipelining capabilities (the queues it produces are also pipelines).
* *ps-mongo*, a version of the *mongo* backend where elements are not physically deleted from the collection when extracted; instead, they are just marked as processed and later deleted automatically using a mongodb TTL index.
* *bucket-mongo*, a first attepmt on storing more than one element on each mongodb record in order to break past mongodb I/O limitations. It is very simple, lacking schedule and reserve support. However, it has staggering throughput on a reasonable durability.
* *bucket-mongo-safe*, an evolution of bucket-mongo, provides both scheduling and reserve support with a performance only a bit below bucket-mongo

As mentioned before, persistence and HA depends exclusively on the underliying system: mongodb provides production-grade HA and persistence while using potentially gigantic queues, and with redis one can balance performance and simplicity over reliability and durability, by using standalone redis, redis sentinel or redis cluster. Keuss uses [ioredis](https://github.com/luin/ioredis) as redis driver, which supports all 3 cases.

The following table shows the capabilities of each backend:

backend           | delay/schedule | reserve/commit | pipelining | history | throughput |
------------------|:--------------:|:--------------:|:----------:|:-------:|:-----:|
redis-list        | - | - | - | - | ++++
redis-oq          | x | x | - | - | +++
mongo             | x | x | - | - | ++
pl-mongo          | x | x | x | - | +
ps-mongo          | x | x | - | x | ++
bucket-mongo      | - | - | - | - | +++++
bucket-mongo-safe | x | x | - | - | +++++

# Signaller
**Signaller** provides a bus interconnecting all keuss clients, so events can be shared. Keuss provides 3 signallers:
* *local* : provides in-proccess messaging, useful only for simple cases or testing
* *redis-pubsub*: uses the pubsub subsystem provided by redis
* *mongo-capped*: uses pubsub on top of a mongodb capped collection, using [@nodebb/mubsub](https://www.npmjs.com/package/@nodebb/mubsub)

So far, the only events published by keuss are:
* *element inserted in queue X*, which allows other clients waiting for elements to be available to wake up and retry. A client will not fire an event if another one of the same type (same client, same queue) was already fired less than 50ms ago
* queue paused/resumed

# Stats
**Stats** provides counters and metrics on queues, shared among keuss clients. The supported stats are:
* elements put
* elements got
* paused status

Three options are provided to store the stats:
* *mem*: very simple in-process, memory based.
* *redis*: backed by redis hashes. Modifications are buffered in memory and flushed every 100ms.
* *mongo*: backed by mongodb using one object per queue inside a single collection. Modifications are buffered in memory and flushed every 100ms.

# How all fits together
* *Queues*, or rather clients to individual queues, are created using a *backend* as factory.
* *Backends* need to be initialized before being used. Exact initialization details depend on each backend.
* When creating a *queue*, a *signaller* and a *stats* are assigned to it. The actual class/type to be used can be specified at the queue's creation moment, or at the backend initialization moment. By default *local* and *mem*, respectively, are used.
* *Queues* are created on-demand, and are never destroyed as far as keuss is concerned. They do exist as long as the underlying backend kepts them in existence: for example, redis queues dissapear as such when they become empty.
* *Pipelines* are, strictly speaking, just enhanced queues; as such they behave and can be used as a queue.

More info on pipelines [here](Pipeline/README.md)
