# keuss
Job Queues on selectable backends (for now: mongodb, redis) for node.js

Still alpha, basic structure in flux

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
* *redis-oq*, backed using an ordered queue on top of redis (made in turn with a sorted set, a hash and some lua). Provides all queue features but reserve-commit-rollback (although this support is planned). Noticeable faster than mongodb
* redis-list, backed using a redis list. Does not offer reserve-commit-rollback nor the ability to schedule, but is much faster than redis-oq

As mentioned before, persistence and HA depends exclusively on the underliying system: mongodb provides production-grade HA and persistence while using potentially gigantic queues, and with redis one can balance performance and simplicity over reliability and durability, by using standalone redis, redis sentinel or redis cluster. Keuss uses [ioredis](https://github.com/luin/ioredis) as redis driver, which supports all 3 cases

The following table shows the capabilities of each backend:

backend    | delay/schedule | reserve/commit
-----------|:--------------:|:--------------:
redis-list | - | - 
redis-oq   | x | - 
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

### Quickstart
```javascript
// create a simple producer on top of redis-list, no signaller, in-mem stats
var MQ = require ('keuss/backends/redis-list');

var factory_opts = {};
    
// initialize factory    
MQ (factory_opts, function (err, factory) {
  if (err) {
    return console.err (err);
  }

  // factory ready, create one queue
  var q_opts = {};
  var q = factory.queue ('test_queue', q_opts);

  // insert element
  q.push ({a:1, b:'666'}, function (err, res) {
    if (err) {
      return console.err (err);
    }

    // element inserted at this point. pop it again
    var pop_opts = {};
    q.pop ('consumer-one', pop_opts, function (err, res) {
      if (err) {
        return console.err (err);
      }

      console.log ('got this: ', res.payload);
    });
  });
});

```

### Factory API
Backends, which work as queue factories, have the following operations

#### Initialization
```javascript
var QM = require ('keuss/backends/<backend>');

MQ (opts, function (err, factory) {
  // factory contains the actual factory, initialized
})
```

where 'opts' is an object containing default values for queue creation, plus the following backend-dependent values:
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
    * provider: signaller factory (require)
    * opts: options for the signaller factory (see below)
  * stats: stats store to use for this queue
    * provider: stats factory (require)
    * opts: options for the stats factory (see below)

### Signaller

### Stats

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
totalSize (function (err, res){
  ...
})
```
res contains the number of elements in the queue (that is, including scheduled elements with a schedule time in the future)

#### Time of schedule of next message
```javascript
next_t (function (err, res){
  ...
})
```
Returns a Date, or null if queue is empty. Queues with no support for schedule/delay always return null
#### push (payload, opts, callback) {
#### pop (cid, opts, callback) {
#### cancel (tid, opts) {
#### reserve (function (err, res)   
#### ok (id, cb) {
####  ko (id, cb) {

### Redis connections

### Logging

### Working with no signallers
Even when using signallers, get operations on queue never block or wait forever; waiting get operations rearm themselves 
every 15000 millisec (or whatever specified in the *pollInterval*). This feature provides the ability to work with more than one process 
without signallers, geting a maximum latency of *pollInterval* millisecs, but also provides a safe backup in the event of signalling lost for whatever reason
