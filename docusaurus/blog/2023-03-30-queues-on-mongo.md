---
title: Modelling queues on MongoDB
author: Pep Martinez
author_url: https://github.com/pepmartinez
tags: [mongodb, tech]
---

This is a series of of articles describing the technical details on which `keuss` is based to build a rather complete
queue middleware (`QMW` henceforth) with a quite shallow layer on top of `MongoDB`. The basic approach is well known and understood, but
`keuss` goes well beyond the basic approach to provide extra functionalities

## Some nomenclature

Let us start establishing some common nomenclature that will appear later on:

* ***job queue***: A construct where elements can be inserted and extracted, in a FIFO (first in, first out) manner. Elements 
  extracted are removed from the queue and are no longer available
* ***queue middleware (qmw)***: A system that provides queues and means for actors to perform as producers, consumers or both
* ***push***: action of inserting an element into a queue
* ***pop***: action of extracting an element from a queue
* ***reserve/commit/rollback***: operations to provide more control on the extraction of elements: first the element is _reserved_,
  (making it invisible by other reserve or pop operations, but still present in the queue), then once the element is processed it is _committed_ (and only then the element is removed from the queue) or _rolledback_ (meaning it is made elligible again for other reserve or pop, possibly after some delay); if none of _commit_ or _rollback_ happen after some time, an automatic _rollback_ is applied.
* ***consumer***: an actor performing pop and/or reserve-commit-rollback operations on a queue. A queue can have zero or more concurrent consumers
* ***producer***: an actor performing push operations on a queue. A queue can have zero or more concurrent producers
* ***at-most-once***: consumer guarantee associated with the `pop` operation: since the element is first removed from the queue, and
  then the consumer proceeds to process it, if the consumer dies or crashes in between the element will be lost. That is, losses are
  tolerated, but duplications are not

  ```mermaid
  sequenceDiagram
    autonumber
    participant queue
    participant consumer
    consumer->>+queue: pop
    queue->>-consumer: element
    activate consumer
    note left of queue: element is no longer in queue
    note right of consumer: process element
    deactivate consumer
    note right of consumer: element processed, get another
    consumer->>+queue: pop
    queue->>-consumer: element
    
  ```

* ***at-least-once***: consumer guarantee associated with the `reserve-commit-rollback` operations: if the consumer crashes between
  `reserve` and `commit` the element will eventually be auto-rolledback and be processed again (possibly by another consumer). 
  Therefore, duplications are tolerated but losses are not

  ```mermaid
  sequenceDiagram
    autonumber
    participant queue
    participant consumer
    consumer->>+queue: reserve
    queue->>-consumer: element
    activate consumer
    note left of queue: element is still in queue, but not accesible to other consumers
    note right of consumer: process element
    consumer->>-queue: commit
    activate queue
    queue->>consumer: ack
    deactivate queue
    note left of queue: element is no longer in queue
    note right of consumer: element processed, get another
    consumer->>+queue: pop
    queue->>-consumer: element
  ```

* ***exactly-once***: theoretical consumer guarantee where no losses and no duplications can happen. It involves the use ot monotonical 
  identifiers or window-based duplication detection, and is generally extremelly complex to achieve, and almost in all cases with a
  hefty performance penalty. It is almost never offered out fo the box in any QMW
* ***deadletter queue***: usually, there is a maximum number of times an element can be rolled back after a reserve, in order to prevent 
  ill-formed or otherwise incorrect messages to stay forever in queues. Upon rollback, if the element has reached the maximum number of
  rollbacks it is remove from the queue and pushed into the deadletter queue, which is an otherwise regular queue
* ***ordered queue***:  A non-FIFO queue: insertions are not done at the tail of the queue, but at any point. This means insertions are 
  no longer _O(1)_: depending on the technology used they can be _O(n_) or better, such as _O(log(n))_ for a btree-based queue; same goes for 
  push/reserve operations, they are no longer _O(1)_.

  Using ordered queues on a QMW is key to implement certain operations: not only the more obvious such as delay, schedule or priorities,
  but also robust and performing reserve/commit/rollback
  
  Using a database to implement queues makes ordered queues a bliss: using a regular index is usually all you need to get
  near-constant-complexity operations
* ***delay/schedule***: Push operation when the element is marked to not to be elligible for pop or reserve _before_ a certain time. 
  The presence of delayed elements must not impact in any way the rest of elements (that is, the rest of elements' elligibility must not
  change) or the queue itself (that is, que presence of delayed elements must not degrade the queue performance or capabilities)

  This feature can be very easily implemented using an ordered queue, where the order is defined by a timestamp representing the 
  _mature_ time: the time when the element can be popped or reserved, and not before

  The delay/schedule feature can be applied also to rollbacks, since a rollback is conceptually a re-insertion; delays in rollbacks
  provide a way to implement [exponential backoff](https://en.wikipedia.org/wiki/Exponential_backoff) easily, to prevent busy 
  reserve-fail-rollback loops when only one element is in the queue, and the element is repeteadly rolled back upon processing

## Basic building blocks

Here's what you need to build a proper QMW:

1. A ***storage subsystem***: Data for the contents of the queues have to be stored somewhere. It has to provide:
    1. **Persistency**: data must be stored in a permanent manner, realiably. In-memory QMW has its niche, but we will
       focus on _persistent_ QMWs
    2. **High Availability**: we do not want a hardware or network failure to take down the QMW. It should run in a _cluster_ 
       manner, on several machines (possibly in separated geographical locations); if one of the machines fail the rest
    can cope without (or with minimal) disruption
    3. **Sufficient Throughput**: the storage should be able to handle a high number of operations per second
    4. **Low Latency**: operations should be performed very fast, ideally as independent of throughput as possible

2. An ***event bus***: all QMW clients would need some form of central communication to be aware of certain events in the 
   QWM. For example, if a client is waiting for data to become available in a queue, it should be able to simply await for
   an event, instead of running a poll busy-loop. Another example  of useful event is to signal whether a queue becomes 
   paused (since it must be paused for _all_ clients)

   This event bus can be a _pub/sub_, stateless bus: only connected clients are made aware of events and there is no need to save
   events for clients that may connect later. This simplifies the event bus by a lot.

The whole idea behind `keuss` is that all those building blocks are already available out there in the form of DataBase
systems, and all there is to add is a thin layer and a few extras.

## The need for atomic operations

However, not just *any* storage (or DB, for that matter) is a good candidate to model queues: there is at least one feature
that, lest it be present, renders queue modelling very difficult if not impossible: _atomic modify operations_

An atomic modify operation in the context of a storage system can be defined as the ability to perform a read and a modify 
on a single record without the possibility of a second modify interfering, changing the record after the read but before 
the modify (or after the modify and before the read)

If the storage system provides such primitives, it is relatively easy and simple to model queues on top of it; also, the 
overall performance (throughput and latency) will greatly depend on the performance of such operation: most RDBMs can do
this by packing the read and the modify inside a _transaction_, but that usually degrades the performance greatly, to a
point where it is not viable for queue modelling

There are 2 major storage systems that provide all the needed blocks, along with atomic modifies: `MongoDB` and `Redis`.
`MongoDB` has turned out to be an almost perfect fit to back a QMW, as we shall see. `MongoDB` provides a set of atomic 
operations to read and modify, and to read and remove. Those operations guarantee that the elements selected to be read 
and then modified (or removed) will not be read by others until modified (or not read at all if it's removed)

`Redis` is also a good fit, but it does nor provide a good enough storage layer: it is neither persistent nor high available. 
Arguably, that's a default behaviour: `Redis-Cluster` coupled with proper persistency should in theory be up to the task. 
However, this series of articles would focus on `MongoDB` only. For now, let us say that atomic operations are very easily
added to `Redis` by coding them as `lua` extensions, since all operations in `Redis` are atomic by design

In the following sections we will see how the implementations of common QMW operations can be indeed solved elegently using
atomic operations provided by MongoDB as the underlying DB/storage

## Simple approach: good enough queues

There is a very simple, very common way to model queues on top of mongoDB collections. This model does not support 
reserve-commit-rollback, nor it does support delay/schedule. The model can be succintly put as:

| operation | implementation base       |
|:---------:|:-------------------------:|
| push      | `coll.insertOne (item)`   |
| pop       | `coll.findOneAndDelete()` |

The key is the use of the atomic operation `findOneAndDelete`, which is the combination of a `findOne` and a `remove`, but 
run in one single step. Several actors can perform concurrent `findOneAndDelete` operations without issues, and without 
interfering each other

Actors can perform concurrent `insertOne` operations too, without interference; the same goes for actors performing _both_
`findOneAndDelete` and `insertOne` operations. The net result is that many consumers and producers can be served concurrently
without interferences or loss of performance, which is what one expects of any self-respecting QMW

This model provides a very simple but rather capable powerful QMW:

* queues are _mostly_ strict FIFO (FIFO loses its strict meaning when different producers located in different machines
  are inserting in the same queue, but in practical terms it usually does not matter)
* we got very good persistence, as good as mongodb's
* we got very good HA:
  * both consumers and producers have no state, so they can be replicated without problems
  * there is a practical 1:1 equivalence between queues and collections, so all the HA guarantees mongodb provides on 
    collections apply directly to queues
* we got more than decent performance:
  * mongodb is quite performing on insertions, in the range of Khz (ie, thousands per second)
  * on pop operations, `findOneAndDelete` is less performing than a simple `remove` or a `findOne` but is still able to 
    reach Khz performance. In practice, `findOneAndDelete` is the bottleneck of this model, because it serializes calls 
    to `pop` within each queue

The main drawback of this model is the fact that the pop/reserve operations can only be performed in a poll loop: they 
either return an element or return 'no elements in queue' (or return an error), in all cases pretty mich immediately. 
Therefore, wait state of arbitrary duration must be inserted in the consumer loop if the operation returns 'no elements in queue': 
otherwise you will get a busy loop where your pop/reserve call relentlessly return 'no elements', eating the CPU in the
process (incidentally, this is a text-book case of poll loop)

In some cases, where latencies in the range of seconds or tens of seconds are of no concern, a pool loop can be happily
used, so this makes a valid, simple and effective model, especially if you already use MongoDB. In cases where latencies
are expected to be near-realtime something better is needed

## Adding an event bus

At this point, one of the best improvements to the model is to remove the need for poll loops; for that to happen, we 
need the pop/reserve operations to 'block' if there are no elements, until they are. A naïve way to do so is to add the
poll loop in the pop/reserve calls, so the caller would have the _illusion_ of blocking:

  ```mermaid
  sequenceDiagram
    autonumber
    participant queue
    participant consumer
    participant caller
    caller->>consumer: pop
    consumer->>queue: pop
    queue->>consumer: no elements
    note right of consumer: wait a fixed period, then try again
    consumer->>queue: pop
    queue->>consumer: no elements
    note right of consumer: wait a fixed period, then try again
    note left of queue: someone else inserts at least one element
    consumer->>queue: pop
    queue->>consumer: element
    consumer->> caller: element
  ```  

As mentioned, this simply moves the pool loop inside the pop/reserve implemenation, away from the user's eyes. But it
is still a poll loop, with all its limitations. To truly remove the poll loop we need the ability to _wake up_ a waiting
consumer _when_ there are new elements in the queue:

  ```mermaid
  sequenceDiagram
    autonumber
    participant producer
    participant queue
    participant consumer
    participant caller
    caller->>consumer: pop
    consumer->>queue: pop
    queue->>consumer: no elements
    note right of consumer: wait until woken up
    producer->>queue: push
    note right of queue: now we got elements
    queue-->>consumer: wake-up, elements available 
    consumer->>queue: pop
    queue->>consumer: element
    consumer->> caller: element
  ``` 
 
This way the push-to-pop latencies are reduced to close to the theoretical minimum: any consumer would be blocked only when
they have to: when there are no elements

### Possible implementations

#### In-memory pub/sub

#### Redis pub/sub

#### MongoDB capped collection

### Practical considerations & improvements

#### Race conditions

#### High cardinality of events

### Final thoughts
At this point we got a rather decent QMW capable of push/pop with concurrent pubishers and consumers, with persistence and HA, and 
able to manage operations at Khz frequency with millisec latencies; all this with a quite simple and stateless implementation

This model can already solve a great deal of problems where persistent job queues are needed, especially if you already got MongoDB
in your mix. Also, it has 2 advantages over tradicional QMWs :

1. _Performance_: This model produces great performance figures when compared with tradicional QMWs with full persistence/HA activated
2. _Simplicity_: the whole of the implementation is client side, and it is stateless and very thin. 
3. _Ease of debug_: it is very easy to _open the trunk_, peer inside and see exactly what's in each queue, and it equally easy to tweak
   and fix whatever problem you find. In some situations this is an invaluable feature

However, we can do better

## Adding delay/schedule

## Adding reserve-commit-rollback

## Queues with historic data

## Queues fit for ETL pipelines: moving elements from one queue to the next, atomically

## Breaking the throughput barrier of FindAndUpdate: buckets

## Experiments, round 1: data streams

## Experiments, round 2: map of strict-ordered queues


