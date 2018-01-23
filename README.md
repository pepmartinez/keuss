# keuss
Job Queues on selectable backends (for now: mongodb, redis) for node.js

Still beta, basic structure may be in flux

# Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [About](#about)
  - [Concepts](#concepts)
    - [Queue](#queue)
    - [Storage](#storage)
    - [Signaller](#signaller)
    - [Stats](#stats)
  - [How all fits together](#how-all-fits-together)
- [Install](#install)
- [Usage](#usage)
  - [Factory API](#factory-api)
    - [Initialization](#initialization)
    - [Queue creation](#queue-creation)
  - [Signaller](#signaller-1)
  - [Stats](#stats-1)
  - [Queue API](#queue-api)
    - [Get Stats](#get-stats)
    - [Queue name](#queue-name)
    - [Queue type](#queue-type)
    - [Queue occupation](#queue-occupation)
    - [Total Queue occupation](#total-queue-occupation)
    - [Time of schedule of next message](#time-of-schedule-of-next-message)
    - [Add element to queue](#add-element-to-queue)
    - [Get element from queue](#get-element-from-queue)
    - [Cancel a pending Pop](#cancel-a-pending-pop)
    - [Commit a reserved element](#commit-a-reserved-element)
    - [Rolls back a reserved element](#rolls-back-a-reserved-element)
  - [Redis connections](#redis-connections)
  - [Reserve & (commit | rollback)](#reserve--commit--rollback)
  - [Working with no signallers](#working-with-no-signallers)
- [Examples](#examples)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## About
Keuss is an attempt or experiment to provide a serverless, persistent and high-available 
queue middleware supporting delays, using mongodb and redis to provide most of the backend 
needs

As it seems, the key to provide persistency, HA and load balance is to have a storage subsystem 
that provides that, and use it to store your queues. Instead of reinventing the wheel by 
building such as storage I simply tried to adapt what's already out there

Modelling a queue with mongodb, for example, proved easy enough. It resulted simple, cheap and mongodb provides great persistency and HA, and decent support for load balancing. Although using Redis provided similar results, in both cases the load balancing part was somewhat incomplete: the whole thing lacked a *bus* to signal all clients about, for example, when an insertion in a particular queue takes place. Without this layer a certain amount of polling is needed, so it's obviously a Nice Thing To Have

Keuss ended up being a somewhat *serverless* queue system, where the *server* or common parts are bare storage systems such as redis or mongodb. There is no need for any extra *keuss server* in between clients and storage (although an actual keuss-server does exist, serving a different purpose on top of plain keuss). Thus, all keuss actually lays at the *client* side

### Concepts

#### Queue
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

#### Storage
**Storage** or **Backend** provides almost-complete queue primitives, fully functional-complee and already usable as is. Keuss comes with 3 backends, with various levels of features and performance:

* *mongo*, a mongodb-based backend that provides te full set of queue features, still with decent performance
* *redis-oq*, backed using an ordered queue on top of redis (made in turn with a sorted set, a hash and some lua). Provides all queue features including reserve-commit-rollback. Noticeable faster than mongodb
* redis-list, backed using a redis list. Does not offer reserve-commit-rollback nor the ability to schedule, but is much faster than redis-oq

As mentioned before, persistence and HA depends exclusively on the underliying system: mongodb provides production-grade HA and persistence while using potentially gigantic queues, and with redis one can balance performance and simplicity over reliability and durability, by using standalone redis, redis sentinel or redis cluster. Keuss uses [ioredis](https://github.com/luin/ioredis) as redis driver, which supports all 3 cases

The following table shows the capabilities of each backend:

backend    | delay/schedule | reserve/commit
-----------|:--------------:|:--------------:
redis-list | - | - 
redis-oq   | x | x 
mongo      | x | x 

#### Signaller
**Signaller** provides a bus interconnecting all keuss clients, so events can be shared. Keuss provides 2 signallers:
* *local* : provides in-proccess messaging, useful only for simple cases or testing
* *redis-pubsub*: uses the pubsub subsystem provided by redis 

So far, the only events published by keuss is *element inserted in queue X*, which allows other clients waiting for elements to be available to wake up and retry. A client will not fire an event if another one of the same type (same client, same queue) was already fired less than 50ms ago

#### Stats
**Stats** provides counters and metrics on queues, shared among keuss clients. So far, only 'elements inserted' and 'elements got' are maintained. Two options are provided:
* *mem*: very simple in-process, memory based 
* *redis*: backed by redis hashes. Modifications are buffered in memory and flushed every 100ms

### How all fits together
* *Queues*, or rather clients to individual queues, are created using a *backend* as factory
* *Backends* need to be intialized before being used. Exact inittialization details depend on each backend
* When creating a *queue*, a *signaller* and a *stats* are assigned to it. The actual class/type to be used can be specified at the queue's creation moment, or at the backend initialization moment. By default *local* and *mem*, respectively, are used
* *Queues* are created on-demand, and are never destroyed as far as keuss is concerned. They do exist as long as the underlying backend kepts them in existence: for example, redis queues dissapear as such when they become empty

## Install 
```bash
npm install keuss
```

## Usage

### Factory API
Backends, which work as queue factories, have the following operations

#### Initialization
```javascript
var QM = require ('keuss/backends/<backend>');

MQ (opts, function (err, factory) {
  // factory contains the actual factory, initialized
})
```

where 'opts' is an object containing default values for queue creation (such as pollInterval, signaller or stats), plus the following backend-dependent values:
* backend *mongo*
   * url: mongodb url to use, defaults to `mongodb://localhost:27017/keuss`
* backends *redis-list* and *redis-oq*
  * redis: data to create a redis connection to the Redis acting as backend, see below

#### Queue creation
```javascript
// factory has been initialized
var q = factory.queue (<name>, <options>);
```
Where:

* name: string to be used as queue name. Queues with the same name are in fact the same queue if they're backed in the same factory type using the same initialization data (mongodb url or redis conn-data)
* options: the options passed at backend initialization are used as default values:
  * pollInterval: rearm or poll period in millisecs for get operations, defaults to 15000 (see *Working with no signallers* below)
  * signaller: signaller to use for the queue
    * provider: signaller factory
    * opts: options for the signaller factory (see below)
  * stats: stats store to use for this queue
    * provider: stats factory
    * opts: options for the stats factory (see below)

### Signaller
Signaller factory is passed to queues either in queue creation or in backend init, inside *opts.signaller*. Note that the result fo the *new* operation is indeed the factory; the result of the require is therefore a *metafactory*

```javascript
var signal_redis_pubsub = require ('../signal/redis-pubsub');

var local_redis_opts = {
  Redis: {
    port: 6379,
    host: 'localhost',
    db: 6
  }
};

var f_opts = {
  signaller: {
    provider: new signal_redis_pubsub (local_redis_opts)
  }
  .
  .
  .
}

MQ (f_opts, function (err, factory) {
  // queues created by factory here will use a redis pubsub signaller, hosted at redis at localhost, db 6
```

The signaller has no public api *per se*; it is considered just a piece of infrastructure to glue queues together

### Stats
Stats factory is passed to queues either in queue creation or in backend init, inside *opts.signaller*. Note that the result fo the *new* operation is indeed the factory; the result of the require is therefore a *metafactory*

```javascript
var local_redis_pubsub = require ('../signal/redis-pubsub');

var local_redis_opts = {
  Redis: {
    port: 6379,
    host: 'localhost',
    db: 6
  }
};

var f_opts = {
  stats: {
    provider: new signal_redis_pubsub (local_redis_opts)
  }
  .
  .
  .
}

MQ (f_opts, function (err, factory) {
  // queues created by factory here will use a redis-backed stats, hosted at redis at localhost, db 6
```
Stats objects, as of now, store the numer of elements inserted and the number of elements extracted; they are created behind the scenes and tied to queue instances, and the stats-related interface is in fact part fo the queues' interface

### Queue API

#### Get Stats
```javascript
q.stats (function (err, res) {
  ...
})
```
* res contains usage stats (elements insterted, elements extracted)

#### Queue name
```javascript
var qnane = q.name () 
```

#### Queue type
```javascript
var qtype = q.type ()
```
returns a string with the type of the queue (the type of backend who was used to create it)

#### Queue occupation
```javascript
q.size (function (err, res){
  ...
})
```
res contains the number of elements in the queue that are already elligible (that is, excluding scheduled elements with a schedule time in the future)

#### Total Queue occupation
```javascript
q.totalSize (function (err, res){
  ...
})
```
res contains the number of elements in the queue (that is, including scheduled elements with a schedule time in the future)

#### Time of schedule of next message
```javascript
q.next_t (function (err, res){
  ...
})
```
Returns a Date, or null if queue is empty. Queues with no support for schedule/delay always return null

#### Add element to queue
```javascript
q.push (payload, opts, function (err, res) {
  ...
})
```
Adds payload to the queue, calls passed callback upon completion. Callback's *res* will contain the id assigned to the inserted element, if the backup provides one

Possible opts:
* **mature**: unix timestamp where the element would be elligible for extraction. It is guaranteed that the element won't be extracted before this time 
* **delay**: delay in seconds to calculate the mature timestamp, if mature is not provided. For example, a delay=120 guarantees the element won't be extracted until 120 secs have elapsed *at least*
* **tries**: value to initialize the retry counter, defaults to 0 (still no retries). 

*note*: mature and delay have no effect if the backend does not support delay/schedule

#### Get element from queue
```javascript
var tr = q.pop (cid, opts, function (err, res) {
  ...
})
```
Obtains an element from the queue. Callback is called with the element obtained if any, or if an error happened. If defined, the operation will wait for *opts.timeout* seconds for an element to appear in the queue before bailing out (with both err and res being null). However, it immediately returns an id that can be used to cancel the operation at anytime

*cid* is an string that identifies the consumer entity, which is considered to be a simple label

Possible opts:
* **timeout**: milliseconds to wat for an elligible element to appear in the queue to be returned. If not defined it will wait forever
* **reserve**: if true the element is only reserved, not completely returned. This means either *ok* or *ko* operations are needed upon the obtained element once processed, otherwise the element will be rolled back (and made available again) at some point in the future (this is only available on backends capable of reserve/commit)

#### Cancel a pending Pop
```javascript
var tr = q.pop (cid, opts, function (err, res) {...});
.
.
.
q.cancel (tr);
```
Cancels a pending pop operation, identified by the value returned by pop()

#### Commit a reserved element
```javascript
q.ok (id, function (err, res) {
  ...
})
```
commits a reserved element by its id (the id would be at res._id on the res param of pop() operation). This effectively erases the element from the queue

#### Rolls back a reserved element
```javascript
q.ko (id, function (err, res) {
  ...
})
```
rolls back a reserved element by its id (the id would be at res._id on the res param of pop() operation). This effectively makes the element available again at the queue, but it's up to the backend to decide whether to apply a delay to it (as if it were inserted with opts.delay)

### Redis connections
Keuss relies on [ioredis](https://www.npmjs.com/package/ioredis) for connecting to redis. Anytime a redis connection is needed, keuss will 
create it from the opts object passed:
* if opts is a function, it is executed. It is expected to return a redis connection
* if it's an object and contains a 'Redis' field, this field is used to create a new ioredis Redis object, as in *return new Redis (opts.Redis)*
* if it's an object and contains a 'Cluster' field, this field is used to create a new ioredis Redis.Cluster object, as in *return new Redis.Cluster (opts.Cluster)*
* else, a ioredis Redis object is created with opts as param, as in *return new Redis (opts)*

Examples:
* default options
  ```javascript
  var MQ = require ('keuss/backends/redis-list');
  var factory_opts = {};
       
  MQ (factory_opts, function (err, factory) {
    ...
  });
  ```
* specific redis params for ioredis Redis client
  ```javascript
  var MQ = require ('keuss/backends/redis-list');
  var factory_opts = {
    redis: {
      Redis: {
        port: 12293,
        host: 'some-redis-instance.somewhere.com',
        family: 4,
        password: 'xxxx',
        db: 0
      }
    }
  };
       
  MQ (factory_opts, function (err, factory) {
    ...
  });
  ```
* use a factory function
  ```javascript
  var MQ = require ('keuss/backends/redis-list');
  var Redis = require ('ioredis');
  var factory_opts = {
    redis: function () {
      return new Redis ({
        port: 12293,
        host: 'some-redis-instance.somewhere.com',
        family: 4,
        password: 'xxxx',
        db: 0
      })
    }
  };
       
  MQ (factory_opts, function (err, factory) {
    ...
  });
  ```

### Reserve & (commit | rollback)

### Working with no signallers
Even when using signallers, get operations on queue never block or wait forever; waiting get operations rearm themselves 
every 15000 millisec (or whatever specified in the *pollInterval*). This feature provides the ability to work with more than one process 
without signallers, geting a maximum latency of *pollInterval* millisecs, but also provides a safe backup in the event of signalling lost for whatever reason

## Examples
A set of funcioning examples can be found inside the *examples* directory
