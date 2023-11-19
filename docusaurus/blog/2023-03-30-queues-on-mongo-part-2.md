---
title: Modelling queues on MongoDB - II
author: Pep Martinez
author_url: https://github.com/pepmartinez
tags: [mongodb, tech]
draft: true
---

This is a continuation of [Modelling queues on MongoDB - I](/blog/2023/03/30/queues-on-mongo-part-1), where
we explained the technological basis on how to build a rather decent queue middleware by leveraging on preexisting
DB technologies, and adding very little more

Now, we explore how to push the technology further, building on top of what we got so far to add extra, useful 
features

## Adding delay/schedule
This is a feature that is seldom found on QMWs, but that should be asy to implement if the 
persistence is sound: after all, if you got the items safely stored, they can remain stored for
any arbitrary period of time

The tricky part is to provide this feature while honoring these conditions:

* performance should not degrade. Both push and pop should remain `O(1)`
* items awaiting should not block items that are ready

On the other hand, this feature can be used to implement quite a lot of common logic, so it
_should_ be high in the wishlist. Some examples are:

* [exponential backoff](https://en.wikipedia.org/wiki/Exponential_backoff) if whatever you do 
with an item goes wrong and you want to retry later
* simple scheduling of events or actions (_items_ would model both)
* with some extra logic, it's easy to build a recurring or cron-like system, where items _happen_ 
periodically

As it turns out, this is quite easy to model on MongoDB while still maintaining all the features
and capabilities of the _good enough queues_ depicted before. The model can be expressed as:

| operation | implementation base                                             |
|:---------:|:---------------------------------------------------------------:|
| push      | `coll.insertOne ({payload: item, when: params.when OR now())`   |
| pop       | `coll.findOneAndDelete({when < now()}).payload`                 |

## Adding reserve-commit-rollback

## Queues with historic data

## Queues fit for ETL pipelines: moving elements from one queue to the next, atomically

## Breaking the throughput barrier of FindAndUpdate: buckets

## Experiments, round 1: data streams

## Experiments, round 2: map of strict-ordered queues


