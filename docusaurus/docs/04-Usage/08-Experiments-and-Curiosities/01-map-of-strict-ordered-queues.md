---
id: map-of-strict-ordered-queues
title: Map of Strict Ordered Queues
sidebar_label: Map of Strict Ordered Queues
---

## The problem
There is a real-life requirement that sometimes appears on systems using queues to deliver or receive asynchronous notifications: a certain local ordering is needed, so certain notifications must be delivered strictly after others, all of this while respecting asynchronicity on the larger scale

A good example of that would be delivering state-change notifications on entities such as phone calls: one would rather keep strict order on events within a single call, so you would not receive, for example,  a 'caller-pushed-#7' event after receiving 'call-ended'. Also, any block of delay enforced by the orderng on call A should not impact, delay or block call B or any other call

## Possible solutons
This is a complex problem, since it is generally difficult - if not impossible - to ascertain whether you should wait longer for delayed events yet to appear. The general approach is usually a combination of any of these:

1. retrofit delayed events arriving out of order, thus modifying state *post hoc*
2. use strict sequence counters when the events are produced, so spotting a hole becomes easy
3. add the needed *wait-and-reorder* of events at the consumer end; this usually invvolves setting a set of 
  strict-order queues, one per emitting entity

None of those approaches is perfect, every each of them has its own problems:

* #1 : It may not be possible to *go back in time* and anyway it'll imply keeping state or history of such past
* #2 : if the events can come from more than one source it may be next to impossible to produce a common, strict
  monotonical sequence counter
* #3: this is usually just another way to reformulate #1, by holding all the state received until it can be assumed
  it can be emitted and used without risk for *post hoc* modifications later on

So, assuming we're dealing with a problem with no practical an complete solution, we might as well try to produce a partial solution embedded in the queuing middleware

# A partial solution in Keuss: Map Of Queues
The implementation comes in the form of a queue backend named `intraorder`, backed by `mongodb` and works as follows:

* All items in a queue will provide a *grouping identifier*, which is expected at the field `iid`
* When an item is pushed in a queue where other items already exist with the same `iid`, it is *guaranteed* that this item 
  will not be served until the already-existing items are gone (popped, committed or moved to deadletter)
* The former is true also in the presence of retries and delays: if an item is rolled back, it will block 
  any other item with the same `iid` that happened to be pushed after
* Also, delays on insertion of elements are honored (as they are on retries), but they will also block further elements 
  with the same `iid` until the element is removed from the queue

This provides a partial solution to the problem, in the sense that a strict ordering within same `iid` is imposed *for elements not extracted from the queue*  

# Caveats
* It is not possible to remove elements by id in a queue: items can only be removed by means of commit, pop or
  move-to-deadletter
* An external, constant cleanup process is needed to remove exhausted artifacts from the mongodb collection modelling the 
  queue. A complete cleanup cannot be performed at the pop/commit without risking loss of items
