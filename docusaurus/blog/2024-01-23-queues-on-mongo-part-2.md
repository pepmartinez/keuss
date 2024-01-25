---
title: Modelling queues on MongoDB - II
author: Pep Martinez
author_url: https://github.com/pepmartinez
tags: [mongodb, tech]
---

This is a continuation of [Modelling queues on MongoDB - I](/blog/2024/01/22/queues-on-mongo-part-1), where
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
| push      | `coll.insertOne ({payload: params.item, when: params.when OR now()})`  |
| pop       | `coll.findOneAndDelete({when < now()}, {orderby: {when: $asc}}).payload`                 |

One of the obvious changes is, we no longer insert the item as is: we encapsulate it inside an _envelope_ where we put extra information; in this case, a timestamp stating when the object should start being eligible for a `pop` operation. Thus, the `pop` will only affect items whose `when` timestamp lies in the past, and ignore those with the timestamp still in the future

Then, in order to keep the performance close to `O(1)` we must be sure the collection has an index on `when`; moreover, it would be advisable to also order the `findOneAndDelete` operation by `when`, ascending: this way we will add best-effort ordering, where elements with a longer-due timestamp are popped first

## Adding reserve-commit-rollback
A feature that should be offered on every decent QMW is the 
ability to reserve an item, then process it and commit it once 
done, or rollback it if something fails and we want it to be 
retried later (or by other consumer)

This allows for what's known as _at-least-once_ semantics: 
every item in the queue is guaranteed to be treated at least 
once even in the event of consumer failure. It _does not_ 
guarantee lack of duplications, though. By contrast, the simple _pop_ model provides _at_most_once_ semantics: duplications are 
guaranteed to not to happen, but at the cost of risk of item 
loss if a consumer malfunctions

Reserve-commit-rollback model can be expressed as the following extension of the 
_delay/schedule_ model above :

| operation | implementation base                                                                                   |
|:---------:|:-----------------------------------------------------------------------------------------------------:|
| push      | `coll.insertOne ({payload: params.item, when: params.when OR now(), retries: 0, reserved: false})`           |
| pop       | `coll.findOneAndDelete({when < now()}, {orderby: {when: $asc}}).payload`                                                 |
| reserve   | `coll.findOneAndUpdate({when < now()}, {when: (now() + params.timeout), reserved: true}, {orderby: {when: $asc}})`       | 
| commit    | `coll.delete({_id: params.reserved_item._id})`                                                                    | 
| rollback  | `coll.findOneAndUpdate({_id: params.reserved_item._id}, {when: (now() + params.delay), reserved: false, retries: $inc})` |

The general idea is to leverage the existing scheduling feature: to reserve an element is just to set its `when`
time ahead in the future, by a fixed `timeout` amount; if the consumer is unable to process the element in this 
time, the item will become eligible again for other consumers.

The `commit` operation simply deletes the entry by using the `_id` of the element returned by 
`reserve` (which is referred to above as `params_reserved_item`); the `rollback` is a bit more complex: 
it modifies it to remove the `reserved` flag, increments
the `retries` counter and -most important- sets a `when` time further in the future. This last bit fulfills
the important feature of adding delays to retries, so an element rejected by a consumer for further retry 
will not be available immediately (when it is likely to fail again)

Note that the `reserved` flag is purely informational, although further checks could be done on it to improve
robustness. The same goes for `retries`: it just counts the number of retries; more logic could be added to this,
for example adding a _deadletter-queue_ feature: if the number of retries goes too high, the items are moved to a 
separated queue for a more dedicated processing at a later time

## Queues with historic data
Here's another twist: instead of fully removing items once consumed (by means f `pop` or `commit`), we just mark 
them as deleted; then we keep them around for some time, just in case we need to inspect past traffic, or replay 
some items. This feature can be desirable on environments where the ability to inspect or even reproduce past traffic
is paramount. Also, this can be easily done at the expense of storage space only, with the following variation over
the model above:

| operation | implementation base                                                                                         |
|:---------:|:-----------------------------------------------------------------------------------------------------------:|
| push      | `coll.insertOne ({payload: params.item, when: params.when OR now(), retries: 0, reserved: false})`                 |
| pop       | `coll.findOneAndUpdate({when < now(), processed: $nonexistent}, {processed: now(), when: $INF}, {orderby: {when: $asc}}).payload`    |
| reserve   | `coll.findOneAndUpdate({when < now(), processed: $nonexistent}, {when: (now() + params.timeout), reserved: true}, {orderby: {when: $asc}})` | 
| commit    | `coll.update({_id: params.reserved._id}, {processed: now(), when: $INF})`                                          | 
| rollback  | `coll.findOneAndUpdate({_id: params.reserved._id}, {when: (now() + params.delay), reserved: false, retries: $inc})`       |

Then, we need to add a [TTL index](https://www.mongodb.com/docs/manual/core/index-ttl/) on the new field `processed`, with 
some long-enough expiration time

The main difference is the addition of a `processed` field that marks both whether the item was processed (that is _deleted_,
_no more_, _gone to meet its maker_) and if so, when that happened. This field is also used to delete old entries, once some
fixed time has elapsed. This means those queues can potentially grow very big, cause the condition to remove old entries is 
age, and not size

Note that, in order to improve performance a bit, when an element is processed (after either _pop_ or _commit_) its _when_ is
set to some time far in the future, to move it 'away' of the _get_/_reserve_ query

## Queues fit for ETL pipelines: moving elements from one queue to the next, atomically

This is an interesting concept: one of the common uses of job queues is to build what's known as ELT pipelines: a set of 
computing stations where items are transformed or otherwise processed, connected with queues. A common example would be 
a POSIX shell pipeline, where several commands are tied together so the output of one becomes the input of the next; a 
ETL pipeline can have also forks and loops, so the topology can be generalized to a graph, not just a linear pipeline

Let us assume for a moment that messages are never created or duplicated in any station: in other words, an item entering 
a station will produce zero or one items as output. In this scenario, one of the reliability problems that arise is that, 
usually, moving items from one (input) queue to the next (output) queue is not an atomic operation. This may lead to either item loss or item duplication in the case of station
 malfunction, even if we use `reserve-commit`

If we push to output after committing on input, we incur on risk of loss:

  ```mermaid
  sequenceDiagram
    autonumber
    participant input-queue
    participant station
    participant output-queue
    station->>+input-queue: reserve
    input-queue->>-station: element
    activate station
    note right of station: process element
    station->>-input-queue: commit
    activate input-queue
    input-queue->>station: ack
    deactivate input-queue
    note left of input-queue: element is no longer in queue
    note right of station: potential to item loss here
    station->>+output-queue: push
  ```

whereas if we push to output _before_ commit on input, we risk duplication:
  ```mermaid
  sequenceDiagram
    autonumber
    participant input-queue
    participant station
    participant output-queue
    station->>+input-queue: reserve
    input-queue->>-station: element
    activate station
    note right of station: process element
    note left of input-queue: element is still in queue
    station->>+output-queue: push
    note right of station: potential to item duplication here
    station->>-input-queue: commit
    activate input-queue
    input-queue->>station: ack
    deactivate input-queue
    station->>+output-queue: push
  ```

So, the _commit-in-input_ and _push-on-output_ operations must be done atomically; and it turns out it is quite simple 
to extend the model to accommodate that as a new, atomic _move-to-queue_ operation (although it comes at a price, as we 
will see)

This new operation requires that _all_ queues of a given pipeline have to be hosted in the same mongodb collection; so, 
our item envelope grows to contain an extra field, `q`. Then, all operations are augmented to use this new field:

| operation | implementation base                                                                                   |
|:---------:|:-----------------------------------------------------------------------------------------------------:|
| push      | `coll.insertOne ({q: params.qname, payload: params.item, when: params.when OR now(), retries: 0, reserved: false})` |
| pop       | `coll.findOneAndDelete({q: params.qname, when < now()}, {orderby: {when: $asc}}).payload`                                             |
| reserve   | `coll.findOneAndUpdate({q: params.qname, when < now()}, {when: (now() + params.timeout), reserved: true}, {orderby: {when: $asc}})`          | 
| commit    | `coll.delete({_id: params.reserved._id})`                                                                    | 
| rollback  | `coll.findOneAndUpdate({_id: params.reserved._id}, {when: (now() + params.delay), reserved: false, retries: $inc})` |

The new operation _move-to-queue_ is expected to act upon a reserved item, and can be modelled as:

| operation | implementation base                                                                                   |
|:---------:|:-----------------------------------------------------------------------------------------------------:|
| moveToQ   | `coll.findOneAndUpdate({_id: params.reserved._id}, {q: params.new_qname, reserved: false, retries: 0})`  |

The operation is rather similar to a rollback, and it is definitely atomic
