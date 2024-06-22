---
id: stream-mongo
title: Stream-mongo backend
sidebar_label: Stream-mongo backend
---

`stream-mongo` is the result of a series of experiments to find out if implementing event streaming on top of mongodb with a 
similar set of features that those offered by the likes of `kafka` is, indeed, viable. 

One key feature is the concept of `consumer groups`: in short, consumers can identify themselves as part of a group (a label)
so it is guaranteed that each event/message will be consumed exactly by one consumer in each group. This is crucial for
correct LB/HA and scalability without the need for complex logic or locks in the consumers

There seems to be no such actual implementation out there, and the early tests on the obvious ways were all a dead end:

* using a capped collection is OK for a general pub/sub with some history/replay capabilities, but it seems impossible to
  correctly manage consumer groups
* using a regular collection also proved impossible to manage consumer groups in a general case: logic quickly turns 
  excessively complex and performance quickly degrades with a few groups
* using more than one collection (one for data, one for group management) can't be correctly done without race conditions

A slightly different approach was tried: provide a small, predefined set of consumer groups. In most practical cases events 
on each topic are in fact read by a (very) small set of consumer groups, and they do not change often either. So, this approximation
might be a good compromise 

The resulting implementation is just an extension of `ps-mongo`, where elements consumed are not deleted but marked. Instead of a single 'consume marker', a set of them is added on each pushed element, where each marker represents a consumer group. The marker set and therefore the possible consumer groups of an element are defined by the Queue instance performing the push operation, and several Queues can push to the same queue using different sets. Performance is almost the same than that of `ps-mongo`, with a slightly bigger index usage (each group has its own, separated index created)

The 'consumer markers' also provide all the machinery to do reserve-commit-rollback, and also scheduling. Each consumer group will get its own separated logic and state for reserve-commit-rollback, and retries/scheduling

## Creation options
Creation of a Queue with backend `stream-mongo` takes 2 specific options:

* `ttl`: time to keep consumed elements in the collection after being removed. Defaults to 3600 secs.
* `groups`: string, comma-separated list of possible consumer groups to be used on push operations. Defaults to `A,B,C`
* `group`: string, consumer group to be used on pop/reserve operations. Defaults to first element of `groups`

`ttl` is shared with `ps-mongo` backend and is used to create a TTL index to delete elements from the collection, so they don't get stored forever. Therefore, storage limitation is done by time, not by space or number of elements

`groups` defines the possible consumer groups each subsequent inserted element would be addressed to (more on that later)

## Usage
In short, a `stream-mongo` queue works by attaching a separated 'consumed marker' per each possible consumer group (defined at the queue option `groups`) at push time, and later specifying the desired consumer group at pop/reserve time (defined at queue option `group`); a pop/reserve operation can only act on elements which have a 'consumer marker' for the group specified, and the set of groups of each element is defined by the options.groups of the Queue instance doing the push operation

Let's see an example:
```js
const async = require ('async');
const MQ =    require ('../../backends/stream-mongo');

// initialize factory
MQ ({url: 'mongodb://localhost/keuss_test_stream'}, (err, factory) => {
  if (err) return console.error(err);

  async.parallel ({
    // producer: possible consumer groups are G1, G2 and G4, on top of collection test_stream
    q0: cb => factory.queue ('test_stream', {groups: 'G1, G2, G4'}, cb)

    // first consumer, using consumer group G1
    q1: cb => factory.queue ('test_stream', {group: 'G1'}, cb),

    // second consumer, using consumer group G2
    q2: cb => factory.queue ('test_stream', {group: 'G2'}, cb),
  }, (err, queues) => {
    if (err) return console.error(err);

    // let's roll
    async.series ([
      // push element
      cb => queues.q0.push ({a: 1}, cb),
      cb => setTimeout (cb, 1000),  // wait a bit
      cb => queues.q1.pop ('consumer-1', cb), // pop element in group G1
      cb => queues.q2.pop ('consumer-2', cb), // pop element in group G2
    ], (err, res) => {
      console.log ('element popped for group G1:', res[2]);
      console.log ('element popped for group G2:', res[3]);

      factory.close ();
    });
  });
});
```
Both q1 and q2 will get the same element, inserted by q0. If we change the code a bit:

```js
async.parallel ({
  q0:    cb => factory.queue ('test_stream', {groups: 'G1, G2, G4'}, cb),
  q1:    cb => factory.queue ('test_stream', {group: 'G1'}, cb),
  q2:    cb => factory.queue ('test_stream', {group: 'G2'}, cb),
  q2bis: cb => factory.queue ('test_stream', {group: 'G2'}, cb),
  q3:    cb => factory.queue ('test_stream', {group: 'G3'}, cb),
}, (err, queues) => {
  if (err) return console.error(err);

  async.parallel ([
    cb => setTimeout (() => queues.q0.push ({a: 1}, cb), 1000), // delay push by a second so all consumers are ready
    cb => queues.q1.pop ('consumer-1', cb),
    cb => queues.q2.pop ('consumer-2', cb),
    cb => queues.q2bis.pop ('consumer-2', cb),
    cb => queues.q3.pop ('consumer-2', cb),
  ], (err, res) => {
    ...
  });
});
```
In this situation:

* q1 would get the message
* either q2 or q2bis (exactly one of them) would get a copy too; the other would block forever
* q3 would not get a message and would block forever

## Extra stats
Queues of type `stream-mongo` generate extra stats, besides the standard ones:
* `stream.<group>.put`: number of elements pushed, per consumer group (a single push will increment the counter for all 
  groups defined for the queue)
* `stream.<group>.get`:  number of elements got, per consumer group
* `stream.<group>.reserve`:  number of elements reserved, per consumer group
* `stream.<group>.commit`:  number of elements committed, per consumer group
* `stream.<group>.rollback`:  number of elements rolled back, per consumer group

## Limitations
There are a few minor limitations & glitches in `stream-mongo`, besides the obvious one about not being able to use an unlimited set of possible consumer groups:

* indexes: each possible consumer group in a queue carries the creation of a separated index on the mongodb collection, 
  so be aware of the potential impact on space usage and performance 
* default stats: default queue stats (put, get, reserve...) are no longer meaningful. They still get recorded, though
* no delete: as it happens in a full-fledged stream system, deleting an item has no meaning. therefore, it is not implemented
* arbitrary defaults to groups and group: the fact that the default for groups is 'A,B,C' and the default for group is 'A' might
  seem arbitrary; it is just a set of values that make a default queue of `stream-mongo` work as a replacement for `ps-mongo`, 
  just for coherency (except for the delete operation)
