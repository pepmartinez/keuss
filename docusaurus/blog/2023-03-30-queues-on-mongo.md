---
title: Modelling queues on MongoDB
author: Pep Martinez
author_url: https://github.com/pepmartinez
tags: [mongodb, tech]
---

This is a series of of articles describing the technical details on which `keuss` is based to build a rather complete
queue middleware (`QMW` henceforth) with a quite shallow layer on top of `MongoDB`. The basic approach is well known and understood, but
`keuss` goes well beyond the basic approach to provide extra functionalities

### Basic building blocks
Here's whay you need to build a proper QMW:

1. A ***storage subsystem***: Data for the contents of the queus have to be stored somewhere. It has to provide:
    1. **Persistency**: data must be stored in a permanent manner, realiably. An in-memory QMW has its niche, but we will
       focus on _persistent_ QMWs
    2. **High Availability**: we do not want a hardware or network failure to take down the QMW. It should run in a _cluster_ 
       manner, on several machines (possibly in separated geographical locations); if one of the machines fail the rest
    can cope without (or with minimal) dusruption
    3. **Sufficient Throughput**: the storage should be able to handle a high number of operations per second 
    4. **Low Latency**: operations should be performed very fast, ideally as independent of throughput as possible

2. An ***event bus***: all QMW clients would need some form of central communication to be aware of certain events in the 
   QWM. For example, if a client is waiting for data to become available in a queue, it should be able to simply await for
   an event, instead of running a poll busy-loop. Another example  of useful event is to signal whether a queue becomes 
   paused (since it must be paused for _all_ clients)

   This event bus can be a _pub/sub_ bus: all connected clients are amde aware of events, but there is no need to save
   events for clients that may connect later. This simplifies the event bus by a lot, since it can be made stateless 

The whole idea behind `keuss` is that all those building blocks are already available out there in the form of DataBase
systems, and all there is to add is a thin layer and a few extras. 

## The need for atomic operations
However, not just *any* storage (or DB, for that matter) is a good candidate to model queues: there is at least one feature
that, lest it be absent, modelling queues would be very difficult if not impossible: _atomic modify operations_

An atomic modify operation in the context of a storage system can be defined as the ability to perform a read and a modify 
on a single record without the possibility of a second modify intefering, changing the record after the read but before 
the modify (or after the modify and before the read) 

If the storage system provides such primitives, it is relatively easy and simple to model queues on top of it; also, the 
overall performance (throughput and latency) will greatly depend on the performance of such operation: most RDBMS can do
this by packing the read and the modify inside a _transaction_, but that usually degrades the performance greatly, to a
point where it is not viable for queue modelling

There are 2 major storage systems that provide all the needed blocks, along with atomic modifies: `MongoDB` and `Redis`: 
`MongoDB` has turned out to be an almost perfect fit to back a QMW, as we shall see. `MongoDB` provides a set of atomic 
operations to read and modify, and to read and remove. Those operatiosn guarantee that the elements selected to be read 
and then modified (or removed) will not be read by others until modified (or not read at all if it's removed)

`Redis` is also a good fit, but it does nor provide a good enough storage layer: it is neither persistent nor high available. 
Arguably, that's a default behaviour: `Redis-Cluster` coupled with proper persistency should in theory be up to the task. 
However, this series of articles would focus on `MongoDB` only. For now, let us say that atomic operations are very easily
added to `Redis` by coding them as `lua` extensions, since all operations in `Redis` are atomic by design

## Simple approach: good enough queues

## Queues with historic data

## Queues fit for ETL pipeliles: moving elements from one queue to the next, atomically

## Breaking the throughput barrier of FindAndUpdate: buckets

## Experiments, round 1: data streams

## Experiments, round 2: map of strict-ordered queues


