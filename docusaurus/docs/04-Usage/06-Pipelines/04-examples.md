---
id: examples
title: Examples
sidebar_label: Examples
---

* [simplest](https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/simplest): a very simple pipeline with just 2 queues connected with a DirectLink
* [simulation-fork](https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/simulation-fork): a somewhat complete example with `DirectLink`, `ChoiceLink` and `Sink` instances connecting 5 queues in a fork-like flow. Each process function adds some basic simulated processing with payload updates, random failures and random delays. It also uses deadletter
* [builder](https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/builder): variant of `simulation-fork` done with a pipeline builder
* [fromRecipe](https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/fromRecipe): variant of `simulation-fork`, almost identical to `builder` but using a `factory.pipelineFromRecipe`
