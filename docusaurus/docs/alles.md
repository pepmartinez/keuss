

### Dead Letter
The concept of *deadletter* is very common on queue middlewares: in the case reserve/commit/rollback is used to consume, a maximum number of fails (reserve-rollback) can be set on each element; if an element sees more rollbacks than allowed, the element is moved to an special queue (dead letter queue) for later, offline inspection

By default, keuss uses no deadletter queue; it can be activated vy passing an object `deadletter` at factory creation time, inside the options:
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
* `max_ko`: maximum number of rollbacks pero element allowed. The next rollback will cause the element to be moved to the deadletter queue. Defaults to 0, which means `infinite`
* `queue`: queue name of the deadletter queue, defaults to `__deadletter__`

All storage backends support deadletter. In `ps-mongo` the move-to-deadletter (as it is the case with other move-to-queue operations) is atomic; in the rest, the element is first committed in the original queue and then pushed inside deadletter




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

MQ (opts, (err, factory) => {
  // factory contains the actual factory, initialized
})
```

where 'opts' is an object containing initialization options. Options common to all backends are:
* `name`: Name for the factory, defaults to 'N'
* `stats`:
  * `provider`: stats backend to use, as result of `require ('keuss/stats/<provider>')`. Defaults to `require ('keuss/stats/mem')`
  * `opts`: options for the provider
* `signaller`:
  * `provider`: signaller provider to use, as result of `require ('keuss/signal/<provider>')`. Defaults to `require ('keuss/signal/local')`
  * `opts`: options for the provider
* `deadletter`: deadletter options, described above
  * `max_ko`: max rollbacks per element
  * `queue`: deadletter queue name

the following backend-dependent values:
* backends *mongo*, *pl-mongo* and *ps-mongo*
   * `url`: mongodb url to use, defaults to `mongodb://localhost:27017/keuss`
* backends *redis-list* and *redis-oq*
  * `redis`: data to create a redis connection to the Redis acting as backend, see below
* backend *ps-mongo*
  * `ttl`: time to keep consumed elements in the collection after being removed. Defauls to 3600 secs

##### MongoDB defaults
On MongoDB-based backends, `signaller` and `stats` default to:
* `signaller`: uses `mongo-capped`, using the same mongodb url than the backend, but postfixing the db with `_signal`
* `stats`: uses `mongo-capped`, using the same mongodb url than the backend, but postfixing the db with `_stats`
This alows cleaner and more concise initialization, using a sane default

#### Queue creation
```javascript
// factory has been initialized
var q = factory.queue (<name>, <options>);
```
Where:

* `name`: string to be used as queue name. Queues with the same name are in fact the same queue if they're backed in the same factory type using the same initialization data (mongodb url or redis conn-data)
* `options`: the options passed at backend initialization are used as default values:
  * pollInterval: rearm or poll period in millisecs for get operations, defaults to 15000 (see *Working with no signallers* below)
  * `signaller`: signaller to use for the queue
    * `provider`: signaller factory
    * `opts`: options for the signaller factory (see below)
  * `stats`: stats store to use for this queue
    * `provider`: stats factory
    * `opts`: options for the stats factory (see below)

#### Factory close
```javascript
factory.close (err => {...});
```
Frees up resources on the factory. Queues created with the factory will become unusable afterwards. See 'Shutdown process' below for more info.

### Signaller
Signaller factory is passed to queues either in queue creation or in backend init, inside *opts.signaller*. Note that the result for the *new* operation is indeed the factory; the result of the require is therefore a *metafactory*.

```javascript
var signal_redis_pubsub = require ('keuss/signal/redis-pubsub');

var local_redis_opts = {
  Redis: {
    port: 6379,
    host: 'localhost',
    db: 6
  }
};

var f_opts = {
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

The signaller has no public api *per se*; it is considered just a piece of infrastructure to glue queues together

### Stats
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

### Queue API

#### Get Stats
```javascript
q.stats ((err, res) => {
  ...
})
```
* res contains usage stats (elements insterted, elements extracted, paused status)

#### Queue name
```javascript
var qname = q.name ()
```

#### Queue type
```javascript
var qtype = q.type ()
```
returns a string with the type of the queue (the type of backend which was used to create it)

#### Queue occupation
```javascript
q.size ((err, res) => {
  ...
})
```
returns the number of elements in the queue that are already elligible (that is, excluding scheduled elements with a schedule time in the future)

#### Total Queue occupation
```javascript
q.totalSize ((err, res) => {
  ...
})
```
returns the number of elements in the queue (that is, including scheduled elements with a schedule time in the future)

#### Size of Scheduled
```javascript
q.schedSize ((err, res) => {
  ...
})
```
returns the number of scheduled elements in the queue (that is, those with a schedule time in the future). Returns 0 id the queue does not support scheduling

#### Size of Reserved
```javascript
q.resvSize ((err, res) => {
  ...
})
```
returns the number of reserved elements in the queue. REturns `null` if the queue does not support reserve

#### Pause/Resume
```javascript
// pauses the queue
q.pause (true)

// resumes the queue
q.pause (false)

// gets paused status of queue
q.paused ((err, is_paused) => {
  ...
})
```
Pauses/Resumes all consumers on this queue (calls to pop()). Producers are not afected (calls to push())

The pause/resume condition is propagated via the signallers, so this affects all consumers, not only those local to the process, if a redis-pubsub or mongo-capped signaller is used

Also, the paused condition is stored as stats, so any new call to pop() will honor it

#### Time of schedule of next message
```javascript
q.next_t ((err, res) => {
  ...
})
```
Returns a Date, or null if queue is empty. Queues with no support for schedule/delay always return null

#### Add element to queue
```javascript
q.push (payload, [opts,] (err, res) => {
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
var tr = q.pop (cid, [opts,] (err, res) => {
  ...
})
```
Obtains an element from the queue. Callback is called with the element obtained if any, or if an error happened. If defined, the operation will wait for *opts.timeout* seconds for an element to appear in the queue before bailing out (with both err and res being null). However, it immediately returns an id that can be used to cancel the operation at anytime

*cid* is an string that identifies the consumer entity; it is used only for debugging purposes

Possible opts:
* **timeout**: milliseconds to wait for an elligible element to appear in the queue to be returned. If not defined it will wait forever
* **reserve**: if true the element is only reserved, not completely returned. This means either *ok* or *ko* operations are needed upon the obtained element once processed, otherwise the element will be rolled back (and made available again) at some point in the future (this is only available on backends capable of reserve/commit)

#### Cancel a pending Pop
```javascript
var tr = q.pop (cid, opts, (err, res) => {...});
.
.
.
q.cancel (tr);
```
Cancels a pending pop operation, identified by the value returned by pop()

If no tr is passed, or it is null, all pending pop operations on the queue are cancelled. Cancelled pop operations will get 'cancel' (a string) as error in the callback

#### Commit a reserved element
```javascript
q.ok (id, (err, res) => {
  ...
})
```
commits a reserved element by its id (the id would be at res._id on the res param of pop() operation). This effectively erases the element from the queue.

Alternatively, you can pass the entire `res` object from the `pop()` operation:
```javascript
var tr = q.pop ('my-consumer-id', {reserve: true}, (err, res) => {
  // do something with res
  ...

  // commit it
  q.ok (res, (err, res) => {
    ...
  });
});
```

#### Rolls back a reserved element
```javascript
q.ko (id, next_t, (err, res) => {
  ...
})
```
rolls back a reserved element by its id (the id would be at res._id on the res param of pop() operation). This effectively makes the element available again at the queue, marking to be mature at next_t (next_t being a millsec-unixtime). If no next_t is specified or a null is passed, `now()` is assumed.

As with `ok()`, you can use the entire `res` instead:
```javascript
var tr = q.pop ('my-consumer-id', {reserve: true}, (err, res) => {
  // do something with res
  ...

  // commit or rollback it
  if (succeed) q.ok (res, (err, res) => {
    ...
  })
  else q.ko (res, (err, res) => {
    ...
  })
});
```

NOTE: you must pass the entire `res` for the deadletter feature to work; even if activated at the factory, `ko()` will not honor deadletter if you only pass the `res._id` as `id`

#### Drain queue
```javascript
q.drain (err => {
  ...
})
```
drains a queue. This is a needed operation when a backend does read-ahead upon a pop(), or buffers push() operations for later; in this case, you may want to be sure that all extra elemens read are actually popped, and all pending pushes are committed.

'drain' will immediately inhibit push(): any call to push() will immediately result in a 'drain' (a string) error. The callback will be called when all pending pushes are committed, and all read-ahead on a pop() has been actually popped.

Also, drain() will also call cancel() on the queue immediately before finishing, in case of success.

### Redis connections
Keuss relies on [ioredis](https://www.npmjs.com/package/ioredis) for connecting to redis. Anytime a redis connection is needed, keuss will create it from the opts object passed:
* if opts is a function, it is executed. It is expected to return a redis connection
* if it's an object and contains a 'Redis' field, this field is used to create a new ioredis Redis object, as in *return new Redis (opts.Redis)*
* if it's an object and contains a 'Cluster' field, this field is used to create a new ioredis Redis.Cluster object, as in *return new Redis.Cluster (opts.Cluster)*
* else, a ioredis Redis object is created with opts as param, as in *return new Redis (opts)*

Examples:
* default options
  ```javascript
  var MQ = require ('keuss/backends/redis-list');
  var factory_opts = {};

  MQ (factory_opts, (err, factory) => {
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

  MQ (factory_opts, (err, factory) => {
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

  MQ (factory_opts, (err, factory) => {
    ...
  });
  ```

### Shutdown process
It is a good practice to call close(cb) on the factories to release all resources once you're done, or at shutdown if you want your shutdowns clean and graceful; also, you should loop over your queues and perform a drain() on them before calling close() on their factories: this will ensure any un-consumed data is popped, and any unwritten data is written. Also, it'll ensure all your (local) waiting consumers will end (on 'cancel' error).

Factories do not keep track of the created Queues, so this can't be done internally as part of the close(); this may change in the future.

### Working with no signallers
Even when using signallers, get operations on queue never block or wait forever; waiting get operations rearm themselves
every 15000 millisec (or whatever specified in the *pollInterval*). This feature provides the ability to work with more than one process
without signallers, getting a maximum latency of *pollInterval* millisecs, but also provides a safe backup in the event of signalling loss.

## Bucket-based backends
Up to version 1.4.X all backends worked in the same way, one element at a time: pushing and popping elements fired one or more operations per element on the underlying storage. This means the bottleneck would end up being the storage's I/O; redis and mongo both allow quite high I/O rates, enough to work at thousands of operations per second. Still, the limit was there.

Starting with v1.5.2 keuss includes 2 backends that do not share this limitation: they work by packing many elements inside a single 'storage unit'. Sure enough, this adds some complexity and extra risks, but the throughput improvement is staggering: on mongodb it goes from 3-4 Ktps to 35-40Ktps, and the bottleneck shifted from mongod to the client's cpu, busy serializing and deserializing payloads.

Two bucked-based backends were added, both based on mongodb: bucket-mongo and bucket-mongo-safe. Both are usable, but there is little gain on using fhe first over the second: bucket-mongo was used as a prototyping area, and although perfectly usable, it turned out bucket-mongo-safe is better in almost every aspect: it provides better guarantees and more features, at about the same performance.

### bucket-mongo-safe
In addition to the general options, the factory accepts the following extra options:
* bucket_max_size: maximum number of elements in a bucket, defaults to 1024
* bucket_max_wait: milliseconds to wait before flushing a push bucket: pushes are buffered in a push bucket, which are flushed when they're full (bucket_max_size elements). If this amount of millisecs go by and the push bucket is not yet full, it is flushed as is. Defaults to 500.
* reserve_delay: number of seconds a bucket keeps its 'reserved' status when read from mongodb. Defaults to 30.
* state_flush_period: changes in state on each active/read bucket are flushed to mongodb every those milliseconds. Defaults to 500.
* reject_delta_base, reject_delta_factor: if no call to ko provide a next_t, the backend will set one using a simple grade-1 polynom, in the form of reject_delta_factor * tries + reject_delta_base, in millisecs. They default to 10000 and ((reserve_delay * 1000) || 30000) respectively
* reject_timeout_grace: number of seconds to wait since a bucket is reserver/read until it is considered timed out; after this, what is left of the bucket is rejected/retried. Defaults to (reserve_delay * 0.8)
* state_flush_period: flush intermediate state changes in each active read bucked every this amount of millisecs

bucket-mongo-safe works by packing many payloads in a single mongodb object:
* at push() time, objects are buffered in memory and pushed (inserted) only when bucket_max_size has been reached or when a bucket has been getting filled for longer than bucket_max_wait millisecs.
* Then, at pop/reserve time full objects are read into mem, and then individual payloads returned from there. Both commits and pops are just marked in memory and then flushed every state_flush_period millisecs, or when the bucked is exhausted
* Therefore, buckets remain unmodified since they are created in terms of the payloads they contain: a pop() or commit/ok would only mark payloads inside buckets as read/not-anymore-available, but buckets are never splitted nor merged

Thus, it is important to call drain() on queues of this backend: this call ensures all pending write buckets are interted in mongodb, and also ensures all in-memory buckets left are completely read (served through pop/reserve)

Also, there is little difference in performance and I/O between pop and reserve/commit; performance is no longer a reason to prefer one over the other.

#### Note on scheduling
Scheduling on bucket-mongo-safe is perfectly possible, but with a twist: the effective mature_t of a message will be the oldest in the whole bucket it resides in. This applies to both insert and rollback/ko. In practice this is usually not a big deal, since anyway the mature_t is a 'not before' time, and that's all Keuss (or any other queuing middleware) would guarantee.

### bucket-mongo
This is a simpler version of buckets-on-mongodb, and to all purposes bucket-mongo-safe should be preferred; it does not provide reserve, nor schedule. It is however a tad faster and lighter on I/O.

It is provided only for historical and educational purposes

## Examples
A set of funcioning examples can be found inside the *examples* directory:
* [webhooks](examples/webhooks/README.md): A small but functionally complete webhook dispatcher sporting retries, reserve-commit, persistence and deadletter
* [snippets](examples/snippets): A set of assorted code snippets for various tasks
