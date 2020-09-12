---
id: processors
title: Processors
sidebar_label: Processors
---

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
