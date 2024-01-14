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
This is a feature that is seldom found on QMWs, but that should be easy to implement if the 
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
| push      | `coll.insertOne ({payload: item, when: params.when OR now()})`  |
| pop       | `coll.findOneAndDelete({when < now()}).payload`                 |

One of the obvious changes is, we no longer insert the item as is: we encapsulate it inside an _envelope_ where we put extra information; in this case, a timestamp stating when the object should start being elligible for a `pop` operation. Thus, the `pop` will only affect items whose `when` timestamp lies in the past, and ignore those with the timestamp still in the future

Then, in order to keep the performance close to `O(1)` we must be sure the collection has an index on `when`; moreover, it would be advisable to also order the `findOneAndDelete` operation by `when`, descending: this way we will add best-effort ordering, where elements with a longer-due timestamp are popped first

## Adding reserve-commit-rollback
A feture that should be offered on every decent QMW is the 
ability to reserve an item, then process it and commit it once 
done, or rollback it if something fails and we want it to be 
retried later (or by other consumer)

This allows for what's known as _at-least-once_ semmantics: 
every item in the queue is guaranteed to be treated at least 
once even in the event of consumer failure. IT _does not_ 
guarantee lack of duplications, though. By contrast, the simple _pop_ model provides _at_most_once_ semantics: duplications are 
guaranteed to not to happen, but at the cost of risk of item 
loss if a consumer malfunctions

Reserve-commit-rollback model cam be expressed as the following extension of the 
_delay/schedule_ model above :

| operation | implementation base                                                                                   |
|:---------:|:-----------------------------------------------------------------------------------------------------:|
| push      | `coll.insertOne ({payload: item, when: params.when OR now(), retries: 0, reserved: false})`           |
| pop       | `coll.findOneAndDelete({when < now()}).payload`                                                       |
| reserve   | `coll.findOneAndUpdate({when < now()}, {when: (now() + timeout), reserved: true})`                    | 
| commit    | `coll.delete({_id: reserved._id})`                                                                    | 
| rollback  | `coll.findOneAndUpdate({_id: reserved._id}, {when: (now() + delay), reserved: false, retries: $inc})` |

The general idea is to leverage the existing scheduling fature: to reserve an element is just to set its `when`
time ahead in the future, by a fixed `timeout` amount; if the consumer is unable to process the element in this 
time, the item will become elligible again for other consumers.

The `commit` operation simply deletes the entry by using the `_id` of the element returned by 
`reserve`; and the `rollback` is a bit more complex: it modifies it to remove the `reserved` flag, increments
the `retries` counter and -most important- sets a `when` time further in the future. This last bit fulfills
the mprotant feature of adding delays to retries, so an element rejected by a consumer for further retry 
will not be available immediately (when it is likely to fail again)

Note that the `reserved` flag is purely informational, although further checks could be done on it to improve
robustness. The same goes for `retries`: it just counts the number of retries; more logic could be added to this,
for example adding a _dead-queue_ feature: if the number of retries goes too high the items are moved to a 
separated queue for a more dedicated processing at a later time

## Queues with historic data
Here's another twist: instead of fully removing items once consumed (by means f `pop` or `commit`), we just mark 
them as deleted; then we keep them around for som etime, just in case we need to inspect past traffic, or replay 
some items. This feature can be desirable on environments where the ability to inspect or even reproduce past traffic
is paramount. Also, this can be easily done at the expense of storage space only, with the following variation over
the model above:

| operation | implementation base                                                                                         |
|:---------:|:-----------------------------------------------------------------------------------------------------------:|
| push      | `coll.insertOne ({payload: item, when: params.when OR now(), retries: 0, reserved: false})`                 |
| pop       | `coll.findOneAndUpdate({when < now(), processed: $nonexistent}, {processed: now(), when: $INF}).payload`    |
| reserve   | `coll.findOneAndUpdate({when < now(), processed: $nonexistent}, {when: (now() + timeout), reserved: true})` | 
| commit    | `coll.update({_id: reserved._id}, {processed: now(), when: $INF})`                                          | 
| rollback  | `coll.findOneAndUpdate({_id: reserved._id}, {when: (now() + delay), reserved: false, retries: $inc})`       |

Then, we need to add a [TTL index](https://www.mongodb.com/docs/manual/core/index-ttl/) on the new field `processed`, with 
some long-enough expiration time

The main difference is the addition of a `processed` field that marks both whether the item was processed (that is _deleted_,
_no more_, _gone to meet its maker_) and if so, when that happened. This field is also used to delete old entries, once some
fixed time has elapsed. This means those queues can potentially grow very big, cause the condition to remove old entries is 
age, and not size

Note that, in order to improve performance a bit, when an element is processed (after either _pop_ or _commit_) its _when_ is
set to some time far in the future, to move is 'away' of the _get_/_reserve_ query

## Queues fit for ETL pipelines: moving elements from one queue to the next, atomically

## Breaking the throughput barrier of FindAndUpdate: buckets

## Experiments, round 1: data streams

## Experiments, round 2: map of strict-ordered queues


