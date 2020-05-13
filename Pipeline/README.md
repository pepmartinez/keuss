# Keuss Pipelines
True atomic [ETL-like](https://en.wikipedia.org/wiki/Extract,_transform,_load) queues and processors

# Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Keuss Pipelines](#keuss-pipelines)
- [Contents](#contents)
- [About](#about)
- [Real, simple example](#real-simple-example)
- [Pipeline-aware Queues](#pipeline-aware-queues)
- [Processors](#processors)
  - [BaseLink](#baselink)
    - [Creation](#creation)
    - [Methods](#methods)
    - [Process Function](#process-function)
      - [Semantic `this` in process function](#semantic-this-in-process-function)
    - [Events](#events)
  - [DirectLink](#directlink)
    - [Creation](#creation-1)
    - [Methods](#methods-1)
    - [Process Function](#process-function-1)
  - [ChoiceLink](#choicelink)
    - [Creation](#creation-2)
    - [Methods](#methods-2)
    - [Process Function](#process-function-2)
  - [Sink](#sink)
    - [Creation](#creation-3)
    - [Methods](#methods-3)
    - [Process Function](#process-function-3)
- [Examples](#examples)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# About
Pipelines is a Keuss extension for building [ETL](https://en.wikipedia.org/wiki/Extract,_transform,_load) processing graphs with ease while guaranteeing atomicity in the processing: whatever happens at the processing of an element, the element is guaranteed to be in either the source or in the destination queue; never in both, never in none.

Keuss pipelines are build upon Keuss Queues with *pipeline* capacity, which means Pipelines inherit all their advantages in terms of HA, durability and performance. So far, Keuss offers only one Queue backend with pipeline capacity, `pl-mongo`

Queues are linked together with processing units named *Processors*, which glue together a source queue with zero or more destination queues. Each processor encapsulates a loop that could be described -in its simplest form- as follows:


```
forever do
  src_queue.reserve () -> element    # reserve an element from entry queue
  process (element) -> err, res      # process the element

  if (err) then
    if (err.drop) do                 # error tells processor to drop/ignore the element
      src_queue.commit (element)
    else do
      src_queue.rollback (element)   # regular error, rollback. It would be retried
    end
  else
    if (res.drop) do                 # processed ok, but drop the item anyway
      src_queue.commit (element)
    else do
      # commit on entry queue and insert into the exit queue, all in one atomic operation
      # modifications in the payload are conserved
      move_to_next_queue (element, src_queue)
    end
  end

  next_loop
end
```

* The `process()` part is user-provided, passed as a function on the initialization of the processor
* The exact semantics of `move_to_next_queue()` vary depending on the specific type of Processor chosen

# Real, simple example
Here is the simplest possible example: 2 queues connected with a very simple processor. Elements in the source queue are taken, a `passed: true` is added to them and moved to the next queue:

```javascript
const MQ = require    ('keuss/backends/pl-mongo');
const PDL = require   ('keuss/Pipeline/DirectLink');
const async = require ('async');

const factory_opts = {
  url: 'mongodb://localhost/qeus'
};

// initialize factory
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);

  // factory ready, create 2 queues on default pipeline
  const q_opts = {};
  const q1 = factory.queue ('test_pl_1', q_opts);
  const q2 = factory.queue ('test_pl_2', q_opts);

  // tie them up, q1 -> q2
  const pdl = new PDL (q1, q2);

  pdl.start ((elem, done) => {
    // pass element to next queue, set payload.passed to true
    done (null, {
      update: {
        $set: {passed: true}
      }
    });
  });

  // insert elements in the entry queue
  async.timesLimit (111, 3, (n, next) => q1.push ({a:n, b:'see it spin...'}, next));

  // read elements at the outer end
  async.timesLimit (111, 3, (n, next) => q2.pop ('exit', (err, res) => {
    console.log ('end point get', res);
    next ();
  }));
});
```

just run this example and you'll see 111 elements being inserted at q1, being processed at the pdl processor, and then popped from q2

# Pipeline-aware Queues
As stated before only one Keuss Queue backed -`pl-mongo`- is compatible with pipelines. Those are the pipeline-related options available at the backend:

* `pipeline`: specifies the pipeline name for this queue. Only queues within the same pipeline (that is, same mongodb url and same pipeline name) can actually work together in a pipeline. Defaults to `default`

In the above example both queues q1 and q2 are created in a pipeline named 'default'. To use a different one you just change the code into:

```javascript
const q_opts = {pipeline: 'some_other_pipeline'};
const q1 = factory.queue ('test_pl_1', q_opts);
const q2 = factory.queue ('test_pl_2', q_opts);
```

Also, pipeline-aware queues provide a new operation:

```javascript
pl_step (id, next_queue, opts, callback)
```

* `id` is a previously reserved Id
* `next_queue` is the queue to (atomically) move the item to
* `opts` are extra options for the operation:
  * `mature`: Date instance with the not-before timestamp for the item, to be used when inserted into `next_queue`. Defaults to `now()`
  * `tries`: number of tries for the item, to be used when inserted into next_queue. Defaults to `0`
  * `payload`: if specified, use this as item's payload when moving to next_queue. This totally substitutes the previous payload
  * `update`: Optional object containing [mongodb update operations](https://docs.mongodb.com/manual/reference/operator/update/). Those are mapped to be applied to the message's `payload`. For example, in the example above:
    ```javascript
    done (null, {
      update: {
        $set: {passed: true}
      }
    });
    ```
    the '`update` parameter of the second argument to `done()` is passed internally to `pl_step()` as `opts.update`: this would cause the message's `payload.passed` to be set to `true` even if there's no explicit mention of `payload`

The whole `pl_step()` operation is guaranteed to be atomic; this includes applying of `opts.payload` or `opts.update` if present

Also, `opts.payload` takes precedence over `opts.update`: if both are specified only the former is taken into account, and the latter is totally ignored

# Processors
A small hierarchy of processors is provided with Pipelines:

## BaseLink
Common base for all Processors, provides all the functionality common to all. It can not be used directly

### Creation
```javascript
const bl = new BaseLink (src_q, opts)
```
Although not intended to be instantiated, this serves as common initialization to all Processors
* `src_q` must be a pipelined queue
* `opts` can contain:
  * `retry_factor_t, retry_base_t`: they control the delay imposed to an element when it is rolled back. The formula is

    `delay-in-seconds = item.tries * retry_factor_t + retry_base_t`

    They default to `2` and `1` respectively
  * `mature`: Date instance or unix timestamp (in milliseconds, as integer) expressing the not-before timestamp for the item, to be used when calling `pl_step()` in the src queue
  * `delay`: delay in seconds to calculate `mature`, if `mature` is not specified

### Methods
* `src()`: returns src queue
* `name()`: returns Processor name
* `on_data(fn)`: specifies the process function to be applied to each element
* `start(fn)`: starts the processor. Optionally, a process function can be passed; if not passed the process function must have been previously specified using `on_data()`
* `stop()`: stops the Processor


### Process Function
The function passed into `on_data()` or `start()` provides the processor logic; this function is referred to as *processor function*. This function is called on each step of the Processor loop with the reserved item, and it is expected to calls its callback once done with the item. The way the function calls the callback determines what happens with the item afterwards

The function looks like this:
```javascript
function (item, cb) {
  ...
})
```

The `item` is received exactly as it comes as result of a (successful) `reserve()` call on the source queue; after processing the item `cb` should be called once to finish the processing of `item` and proceed with the next loop cycle. The callback has the following signature:

```javascript
  cb (err, res);
```
where:

* if `err` is not nil
  * if `err.drop` is exactly `true` the item is committed in the src queue and therefore dropped from the pipeline
  * else the item is rolled back in the src queue, using the processor's `retry_factor_t` and `retry_base_t` to calculate the retry delay. If the queue was created with deadletter support, the item would be moved to the deadletter queue if it has reached its maximum number of rollbacks; in such case, the movement into deadletter is also atomic
* else (if `err` is nill)
  *  if (`res.drop` is exactly `true` the item is committed in the src queue and therefore dropped from the pipeline
  * else the item is passed to the text queue in the pipeline (by means of `pl_next()`)
    * if `res.mature` or `res.delay` exist (or they were specified at the processor's creation) they are used to calculate the delay/mature of the element in the destination queue
    * if `res.payload` exists it is used to replace the item's payload entirely
    * else if `res.update` exists it is used as mongodb-update operations on the item's payload

  All those operations happen in an atomic way

#### Semantic `this` in process function
The function is bound to the processor, so the function can access and use processor's primitives. For example, it can insert copies of the item, or new items, in any of the source or destination queues

In order to use this functionality the process function can not be declared as an 'arrow' function, since those can not be bound. Use the classic `function xxxx (item, cb) {...}` if you intend to access the underlying Processor

### Events
BaseLink inherits from `EventEmitter` and publishes the following events:
* `error`: an error happened in the internal loop. It comes with one parameter, an object with the following fields:
  * `on`: exact type of error:
    * `src-queue-pop`: error while reserving an element on the src queue
    * `src-queue-commit-on-error`: error while committing an element on the src queue when an error was passed and `err.drop==true`
    * `src-queue-rollback-on-error`: error while rolling back an element on the src queue when an error was passed
    * `src-queue-commit-on-drop`: error while committing an element an element on the src queue when processed ok and `res.drop==true`
    * `next-queue`: error while atomically moving the element to the next queue
  * `elem`: element that caused the error. Not present in `src-queue-pop`
  * `error`: original error object
  * `opts`: (only present in `next-queue`) options passed internally to `pl_step()`

## DirectLink
Processor that connects the source queue to exactly one destination queue:
```
 src-queue --> DirectLink --> dst-queue
```

### Creation
```javascript
const PDL = require ('keuss/Pipeline/DirectLink');
const bl = new PDL (src_q, dst_q, opts);
```

In addition to `BaseLink`:
* `dst_q` must be a pipelined queue; also, both `src_q` and `dst_q` must be of the same type and must belong to the same pipeline

### Methods
In addition to those of `BaseLink`
* `dst()`: returns destination queue

### Process Function
In the case of successful processing (i.e.: no `err` in the callback invocation) the item is atomically moved to the `dst` queue.

No other semantics are added to the process function.

## ChoiceLink
Processor that connects the source queue to an array of queues; after processing, each item would be moved to exactly one of those queues:
```
                            |--> dst-queue-0
                            |--> dst-queue-1
 src-queue --> ChoiceLink --|--> dst-queue-2
                            |    ...
                            |--> dst-queue-n
```

### Creation
```javascript
const PCL = require ('keuss/Pipeline/ChoiceLink');
const cl = new PCL (src_q, array_of_dst_queues, opts);
```

In addition to `BaseLink`:
* `array_of_dst_queues` must be an array of pipelined queues; each one must be of the same type and must belong to the same pipeline than `src_q`

### Methods
In addition to those of `BaseLink`
* `dst_by_idx(idx)`: returns destination queue from the array, selected by array index (integer)
* `dst_by_name(name)`: returns destination queue from the array, selected by queue name (string)
* `dst_dimension ()`: returns number of possible destination queues
* `dst_names ()`: returns an array with the names of all dst queues

### Process Function
ChoiceLink expects an `res.dst` in the callback invocation, which must fullfill one of those conditions:
* be an integer and resolve to a valid element when applied as index to the array of destination queues
* be a string and correspond to the name of one of the destination queues

The element will be moved atomically to the specified destination queue upon successful processing (i.e.: no `err`in the callback invocation)

## Sink
Processor that connects the source queue to exactly zero destination queue. That is, a termination point: successfully processed elements are always removed from the pipeline
```
 src-queue --> Sink
```

### Creation
```javascript
const PS = require ('keuss/Pipeline/Sink');
const bl = new PS (src_q, opts);
```

No extra parameters are expected in addition to those of `BaseLink`

### Methods
No extra methods are provided in addition to those of `BaseLink`

### Process Function
In the case of successful processing (i.e.: no `err` in the callback invocation) the item is removed from the pipeline, exactly as if `res.drop` were specified. Actually, `res` is totally ignored

# Examples
* [simplest](examples/pipelines/simplest): a very simple pipeline with just 2 queues connected with a DirectLink
* [simulation-fork](examples/pipelines/simulation-fork): a somewhat complete example with `DirectLink`, `ChoiceLink` and `Sink` instances connecting 5 queues in a fork-like flow. Each process function adds some basic simulated processing with payload updates, random failures and random delays. It also uses deadletter
