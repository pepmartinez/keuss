---
id: building
title: Building Pipelines
sidebar_label: Building
---

Pipelines can be built in 3 ways:
* By directly creating queues and processors, and bonding them together. This is rather low-level and is not the recommended way
* By using a `PipelineBuilder`. This object provides a fluent API that's convenient and very simple. This is the recommended way to created pipelines in code
* By using the method `pipelineFromRecipe` offered by the Queues Factories supporting pipelining. This allows a whole pipeline to be defined in a set of strings and therefore in external files; this makes pipelies portable, reproductible and totally cluster-ready

## Direct Pipeline Creation
This is a quite simple approach: you create the queues, then you create the Processors that would glue them. Processors take i theit constructors the queues they use, so it's rather straightforward:
```javascript
const MQ =  require ('../../../backends/pl-mongo');
const DCT = require ('../../../Pipeline/DirectLink');
const SNK = require ('../../../Pipeline/Sink');
const CHC = require ('../../../Pipeline/ChoiceLink');

function sink_process (elem, done) {
  // define processing for Sinks
}

const factory_opts = {
  // ...
};

// initialize factory
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);

  // factory ready, create queues on default pipeline
  const q_opts = {aaa: 666, b: 'yy'};
  const q1 = factory.queue ('pl_many_q_1', q_opts);
  const q2 = factory.queue ('pl_many_q_2', q_opts);
  const q3 = factory.queue ('pl_many_q_3', q_opts);
  const q4 = factory.queue ('pl_many_q_4', q_opts);
  const q5 = factory.queue ('pl_many_q_5', q_opts);

  // tie them up:
  const dl1 = new DCT (q1, q2);
  const cl1 = new CHC (q2, [q3, q4, q5]);
  const sk1 = new SNK (q3);
  const sk2 = new SNK (q4);
  const sk3 = new SNK (q5);

  sk1.on_data (sink_process);
  sk2.on_data (sink_process);
  sk3.on_data (sink_process);

  cl1.on_data (function (elem, done) {
    // define processing for the ChoiceLink
  });

  dl1.on_data (function (elem, done) {
    // define processing for the DirectLink
  });

  // start the whole lot
  sk1.start ();
  sk2.start ();
  sk3.start ();
  cl1.start ();
  dl1.start ();

  // pipeline is ready now. Push stuff to queues, see it work
});

```
See [Processors](processors.md) for all the available options and features (such as processing functions and error management)

## Creation with a `PipelineBuilder`
`PipelineBuilder` provides a simpler way to create pipelines using a fluent api. Builders are obtained through `factory.builder()` and offers the following methods:

* `pipeline(name)`: initializes a pipeline, passing a name to it. Must be called before any other method, and can be called only once
* `queue(name, opts)`: creates a queue and adds it to the pipeline
* `directLink (name_src_q, name_dst_q, process_fn)`: creates a DirectLink linking queues src_q and dst_q (specified by name), using the process function `process_fn`
* `choiceLink(name_src_q, [name_dst_q1, name_dst_q2, ...name_dst_qn], process_fn)`: creates a ChoiceLink linking src_q and the array of dst_q (specified by name), using the process function `process_fn`
* `sink(name_src_q, process_fn)`: creates a Sink on queue src_q (specified by name), using the process function `process_fn`
* `onError(fn)`: sets the `error` event handler for all processirs created in the pipeline. As with the error handler for Processors, `fn` will receive a single param with the error; in this case the error will be augmented by adding an extra field `processor`, which will be areference to the `Processor` object originating the error
* `done(err, pipeline)`: finished the pipeline creation. No other calls can be done to the builder afterwards. In case of error, the error will be passed in `err`; if all went well `err` will be `null` and the newly created pipeline, an object of type `Pipeline`, will be passed in the `pipeline`; all further interactions with the pipeline will happen through this object

### Pipepine object
The new Pipeline object exports the following methods:
* `start()`: starts the pipeline (simply calls `start()` on all processors)
* `stop()`: stops the pipeline (simply calls `stop()` on all processors)

Here's a simplified example (for a complete, working example see [here](https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/builder)):
```javascript
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);
  const q_opts = {};

  factory
  .builder ()
  .pipeline ('the-pipeline')
  .queue ('test_pl_1', q_opts)
  .queue ('test_pl_2', q_opts)
  .queue ('test_pl_3', q_opts)
  .queue ('test_pl_4', q_opts)
  .queue ('test_pl_5', q_opts)
  .directLink ('test_pl_1', 'test_pl_2', dl_process)
  .choiceLink ('test_pl_2', ['test_pl_3', 'test_pl_4', 'test_pl_5'], choice_process)
  .sink ('test_pl_3', sink_process)
  .sink ('test_pl_4', sink_process)
  .sink ('test_pl_5', sink_process)
  .onError (console.log)
  .done ((err, pl) => {
    if (err) return console.error (err);
    // pipeline pl is ready
    pl.start ();
    // pipeline pl is running
  });
});
```

## Creation with `Factory.pipelineFromRecipe`
