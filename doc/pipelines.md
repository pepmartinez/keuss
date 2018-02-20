# Keuss Pipelines
Überqueues and processors

# Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [About](#about)
- [Real, simple example](#real-simple-example)
- [Pipeline-aware Queues](#pipeline-aware-queues)
- [Processors](#processors)
  - [PipelineLink](#pipelinelink)
    - [creation:](#creation)
    - [methods](#methods)
    - [Processor function](#processor-function)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## About
Keuss allows building of higher level structures atop standard queues: processing nodes glued together with
queues using fully atomic semantics to prevent losses and races

The simplest pipeline is composed by a processor (aka *link*) and 2 queues:

```
entry queue -> processor -> exit queue
```

The processor works in a loop, which logic would be:

```
forever do
  entry_queue.reserve () -> element  # reserve an element from entry queue
  process (element) -> res           # process the element

  if (err) then
    if (err.drop) do                 # error tells processor to drop/ignore the element
      entry_queue.commit (element)
      next_loop
    else do
      entry_queue.rollback (element) # regular error, rollback. It would be retried
    end
  else do
    # commit on entry queue and insert into the exit queue, all in one atomic operation
    # modifications in the payload are conserved
    step (element, entry_queue, exit_queue)
  end
end
```

For now, onlt simple processors, with one entry queue and one exit queue, are provided. More types are planned

The *process()* part is user-provided, passed as a function on the initialization of the processor

## Real, simple example


```javascript
var MQ = require ('keuss/backends/pl-mongo');
var PLL = require ('keuss/PipelineLink');
var async = require ('async');


var factory_opts = {
  url: 'mongodb://localhost/qeus'
};
    
// initialize factory 
MQ (factory_opts, function (err, factory) {
  if (err) {
    return console.error (err);
  }

  // factory ready, create 2 queues on default pipeline
  var q_opts = {};
  var q1 = factory.queue ('test_pl_1', q_opts);
  var q2 = factory.queue ('test_pl_2', q_opts);

  // tie them up, q1 -> q2
  var pll = new PLL (q1, q2);

  pll.start (function (elem, done) {
    var pl = elem.payload;
    pl.pll_processed = true;
    done();
  });

  // insert elements in the entry queue
  async.timesLimit (111, 3, function (n, next) {
    q1.push ({a:n, b:'see it spin...'}, {}, next);
  });

  // read elements at the outer end
  async.timesLimit (111, 3, function (n, next) {
    q2.pop ('exit', {}, function (err, res) {
      console.log ('end point get', res);
      next ();
    });
  });
});

```

just run this example and you'll se 111 elements being inserted at q1, being processed at the pll processor, and then popped from q2

## Pipeline-aware Queues
Only one backed, *pl-mongo* provides queues that can work with pipelines. It works by packing all entries of all queues of the same pipeline inside a single mongodb collection. A few options are available on *pl-mongo* queue creation:

* pipeline: specifies the pipeline name for this queue. Only queues within the same pipeline and created on the same mongodb url can actually work together in a pipeline. Defaults to 'default'

Thus, in the above example both queues q1 and q2 are created in a pipeline named 'default'. To use a different one you just change the code into:

```javascript
  var q_opts = {pipeline: 'some_other_pipeline'};
  var q1 = factory.queue ('test_pl_1', q_opts);
  var q2 = factory.queue ('test_pl_2', q_opts);
```

Also, pipelined queues add a new operation:

```javascript
pl_step (id, next_queue, opts, callback)
```

* id is a previously reserved Id
* next_queue is the queue to (atomically) move the item to
* opts, options for the operation:
  * mature: Date instance with the not-before timestamp for the item, to be used when inserted into next_queue. Defaults to now()
  * tries: number of tries for the item, to be used when inserted into next_queue. Defaults to 0
  * payload: if specified, use this as item's payload when moving to next_queue. Otherwise the payload remains unmodified in the queue (modifications to item.payload once reserved are lost)

Note this operation assumes tht next_queue is an usable pipeline queue: it assumes it's pipelined, of the same type as the one used to reserve the item, and using the same pipeline. No checks at all are done

## Processors
As mentioned, only one procesor is in existence

### PipelineLink

#### creation:
```javascript
var pl = new PipelineLink (src_q, dst_q, opts)
```
  * src_q and dst_q must be pipelined queues of the same type and belonging to the same pipeline
  * opts can be:
    * retry_factor_t, retry_base_t: they control the delay imposed to an element when it is rolled back. The formula is
      delay-in-seconds = item.tries * retry_factor_t + retry_base_t
      They default to 2 and 1 respectively
    * mature: Date instance or unix timestamp (in milliseconds, as integer) expressing the not-before timestamp for the item, to be used when calling pl_step in the src queue
    * delay: delay in seconds to calculate mature, if mature is not specified

#### methods
* returns src queue
  ```javascript
  src () 
  ```

* returns dst queue
  ```javascript
  dst ()
  ```
  
* returns name. A PipelineLink's name is calculated from the names of the src and dst queues
  ```javascript
  name ()
  ```

* start the PL using the passed funcion as processor (see below)
  ```javascript
  start (function (item, cb) {...})
  ```

* safely stop the PL
  ```javascript
  stop ()
  ```

#### Processor function
the function passed into start(), which is the *processor function*, deserves a separated section. This function is called on each step of the PL loop with the reserved item, and it is expected that it calls its callback once done with the item. The way you call the callback specifies what to do with the item; roll it back, drop it, pass it along the pipeline modified or unmodified

The function looks like this:
```javascript
  function (item, cb) {...})
```

The *item* is received exactly as it comes as result of a (successful) reserve() call; the *cb* should be called like this:

```javascript
  cb (error, res);
```
where:
* if error.drop is exactly true, the item is committed in the src queue and therefore dropped from the pipeline
* else, if error is non-null the item is rolled back in the src queue, using PL's *retry_factor_t* and *retry_base_t* to calculate the retry delay
* else (if no error) the item is passed along the pipeline (by calling pl_step()). The *mature* mark is calculated using the *mature* or *delay* options of the PL. 
  If res contains *opts.mature* or *opts.delay* they are used instead.
  The payload is overwritten with that of the item, so if yo modify item.payload those changes get reflected. If you pass a res.payload, this is used instead