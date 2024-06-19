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
cosnt async = require ('async');

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
  
  async.parallel ({
    q1: cb => factory.queue ('pl_many_q_1', q_opts, cb),
    q2: cb => factory.queue ('pl_many_q_2', q_opts, cb),
    q3: cb => factory.queue ('pl_many_q_3', q_opts, cb),
    q4: cb => factory.queue ('pl_many_q_4', q_opts, cb),
    q5: cb => factory.queue ('pl_many_q_5', q_opts, cb),
  }, (err, queues) => {
    if (err) return console.error (err);

    // tie them up:
    const dl1 = new DCT (queues.q1, queues.q2);
    const cl1 = new CHC (queues.q2, [queues.q3, queues.q4, queues.q5]);
    const sk1 = new SNK (queues.q3);
    const sk2 = new SNK (queues.q4);
    const sk3 = new SNK (queues.q5);

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
});
```

See [Processors](processors) for all the available options and features (such as processing functions and error management)

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

`Factory.pipelineFromRecipe` provides a way to define pipelines entirely from strings, including queue, processors, the functions
to be used as process functions and all the code used on those functions. In this way a full, self-contained pipeline can be specified
in a file or set of files

Under the hood it uses [node.js VM module](https://nodejs.org/dist/latest-v12.x/docs/api/vm.html) to create the `Pipeline` object: once created it can be used normally outside of the creation VM

`Factory.pipelineFromRecipe` is provided only on factories created from backends with pipelining support. This single method take the following parameters:

```javascript
Factory.pipelineFromRecipe (
  pipeline_name,
  array_of_bootstrap_code,
  array_of_setup_code,
  extra_context,
  done
)
```

1. A new VM is created using the merge of the default context and the parameter `extra_context`. The default context contains the following:
   * `Buffer`
   * `require`
   * `clearImmediate`, `clearInterval`, `clearTimeout`, `setImmediate`, `setTimeout`, `setInterval`
   * `TextEncoder`, `TextDecoder`
   * `URL`, `URLSearchParams`
   * `builder`: an already initialized builder object, as in `factory.builder ().pipeline (name)`
   * `done`: a function to call when the pipeline is ready, or an error arises. Expects to be `fn (err, pipeline)`
2. Each of the strings in the `array_of_bootstrap_code` is executed in the VM
3. Each of the strings in the `array_of_setup_code` is executed in the VM. It is expected to eventually call `done` with the error or the finished pipeline (`done`is accesible in the context)

The whole idea is to prepare all the needed code for processors' functions in the `array_of_bootstrap_code`, then create the pipeline in the `array_of_setup_code`, calling the `done` function whith the created pipeline

You can find a full example [here](https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/fromRecipe)
