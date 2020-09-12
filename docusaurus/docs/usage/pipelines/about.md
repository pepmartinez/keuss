---
id: about
title: About
sidebar_label: About
---

`Pipelines` is a Keuss extension for building [ETL](https://en.wikipedia.org/wiki/Extract,_transform,_load) processing graphs with ease while guaranteeing atomicity in the processing: whatever happens at the processing of an element, the element is guaranteed to be in either the source or in the destination queue; never in both, never in none.

Keuss pipelines are build upon Keuss Queues with *pipeline* capacity, which means Pipelines inherit all their advantages in terms of HA, durability and performance. So far, Keuss offers only one Queue backend with pipeline capacity, `pl-mongo`

Queues are linked together with processing units named *Processors*, which glue together a source queue with zero or more destination queues. Each processor encapsulates a loop that could be described -in its simplest form- as follows:


```javascript
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

## Real, simple example
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

## Pipeline-aware Queues
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
