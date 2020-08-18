---
id: concepts
title: Concepts
sidebar_label: Concepts
---

## Queue
a **Queue** is more of an interface, a definition of what it can do. Keuss queues are capable of:
* Insert one element.
* Schedule an element: insert one element with a not-before datetime.
* Get an element, and block for some specified time if no element is available.
* Reserve an element, and block for some specified time if no element is available.
* Commit (remove) or rollback (return back) a previously reserved element.
* Get element count.
* Get element count whose not-before datetime is in the future (scheduled elements).
* Get usage stats: elements inserted, elements extracted.

*Element* here translates to any js object. Internally, it's usually managed as json.

## Bucket
The initial idea for Keuss Queues, transtated the elements inserted in the queue into rows of the backed storage. This makes it easy to inspect the elements values directly in the backend, which is pretty useful when you need to debug things up. Buckets came later, as a way to pack more than one message into a single row of the backend to gain performance. See [Bucked-based backends](usage/buckets).

## Pipeline
A **[pipeline](usage/pipelines)** is an enhanced queue that provides an extra operation: pass an element to another queue **atomically**. In an scenario where processors are linked with queues, it is usually a good feature to allow the *'commit element in incoming queue, insert element in the next queue'* to be atomic. This removes chances for race conditions, or message losses.

The pipeline concept is, indeed, an extension of the reserve-commit model; it is so far implemented only atop mongodb, and it is anyway considered as a 'low-level' feature, best used by means of specialized classes to encapsulate the aforementioned processors.

## Processor
A **processor** is an object tied to one or more queues, that controls the flow of messages between them. They are used mainly to define **pipelines**. Currently there are 4 specialized classes of processors defined:
* [BaseLink](usage/pipelines#baselink): This is really more of a base definition for the rest of the specialized processors.
* [DirectLink](usage/pipelines#directlink) (one queue to another).
* [ChoiceLink](usage/pipelines#choicelink) (one queue to one or more queues).
* [Sink](usage/pipelines#sink) (endpoint, one queue to none).

## Storage
**Storage** or **Backend** provides almost-complete queue primitives, fully functional and already usable as is. Keuss comes with 7 backends, with various levels of features and performance:

* *`mongo`*, a mongodb-based backend that provides the full set of queue features, still with decent performance.
* *`redis-oq`*, backed using an ordered queue on top of redis (made in turn with a sorted set, a hash and some lua). Provides all queue features including reserve-commit-rollback. Noticeable faster than mongodb.
* *`redis-list`*, backed using a redis list. Does not offer reserve-commit-rollback nor the ability to schedule, but is much faster than redis-oq
* *`pl-mongo`*, a version of the *`mongo`* backend that provides pipelining capabilities (the queues it produces are also pipelines).
* *`ps-mongo`*, a version of the *`mongo`* backend where elements are not physically deleted from the collection when extracted; instead, they are just marked as processed and later deleted automatically using a mongodb TTL index.
* *`bucket-mongo`*, a first attepmt on storing more than one element on each mongodb record in order to break past mongodb I/O limitations. It is very simple, lacking schedule and reserve support. However, it has staggering throughput on a reasonable durability.
* *`bucket-mongo-safe`*, an evolution of *`bucket-mongo`*, provides both scheduling and reserve support with a performance only a bit below *`bucket-mongo`*.

As mentioned before, persistence and High Availability (HA) depends exclusively on the underliying system: mongodb provides production-grade HA and persistence while using potentially gigantic queues, and with redis one can balance performance and simplicity over reliability and durability, by using standalone redis, redis sentinel or redis cluster. Keuss uses [ioredis](https://github.com/luin/ioredis) as redis driver, which supports all 3 cases.

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

## Signaller
**Signaller** provides a bus interconnecting all keuss clients, so events can be shared. Keuss provides 3 signallers:
* *`local`* : provides in-proccess messaging, useful only for simple cases or testing
* *`redis-pubsub`*: uses the pubsub subsystem provided by redis
* *`mongo-capped`*: uses pubsub on top of a mongodb capped collection, using [@nodebb/mubsub](https://www.npmjs.com/package/@nodebb/mubsub)

So far, the only events published by keuss are:
* *element inserted in queue X*, which allows other clients waiting for elements to be available to wake up and retry. A client will not fire an event if another one of the same type (same client, same queue) was already fired less than 50ms ago.
* *queue X paused/resumed*.

## Stats
**Stats** provides counters and metrics on queues, shared among keuss clients. The supported stats are:
* Elements put
* Elements got
* Paused status

Three options are provided to store the stats:
* *`mem`*: very simple in-process, memory based.
* *`redis`*: backed by redis hashes. Modifications are buffered in memory and flushed every 100ms.
* *`mongo`*: backed by mongodb using one object per queue inside a single collection. Modifications are buffered in memory and flushed every 100ms.

## How all fits together
* *`Queues`*, or rather clients to individual queues, are created using a *backend* as factory.
* *`Backends`* need to be initialized before being used. Exact initialization details depend on each backend.
* When creating a *`queue`*, a *`signaller`* and a *`stats`* are assigned to it. The actual class/type to be used can be specified at the queue's creation moment, or at the backend initialization moment. By default *`local`* and *`mem`*, respectively, are used.
* *`Queues`* are created on-demand, and are never destroyed as far as Keuss is concerned. They do exist as long as the underlying backend kepts them in existence: for example, redis queues dissapear as such when they become empty.
* *`Pipelines`* are, strictly speaking, just enhanced queues; as such they behave and can be used as a queue. More info on pipelines [here](usage/pipelines.md)
