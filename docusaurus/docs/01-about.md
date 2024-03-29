---
id: about
title: About
sidebar_label: About
slug: /
---

Keuss is an attempt or experiment to provide a serverless, persistent and high-available queue middleware supporting delays/schedule, using mongodb and redis to provide most of the backend needs. As of now, it has evolved into a rather capable and complete queue middleware.

The underlying idea is that the key to provide persistency, HA and load balance is to rely on a storage subsystem that provides that, and build the rest on top. Instead of reinventing the wheel by building such as storage I simply tried to adapt what's already out there.

Modelling a queue with mongodb, for example, proved easy enough. It resulted simple, cheap and provides great persistency, HA and decent support for load balancing. Although using Redis provided similar results, in both cases the load balancing part was somewhat incomplete: the whole thing lacked a *bus* to signal all clients about, for example, when an insertion in a particular queue takes place. Without this layer a certain amount of polling is needed, so it's obviously a Nice Thing To Have.

Keuss ended up being a somewhat *serverless* queue system, where the *server* or common parts are bare storage systems such as redis or mongodb. There is no need for any extra *keuss server* in between clients and storage (although an actual `keuss-server` does exist, serving a different purpose on top of plain keuss). Thus, all keuss actually lays at the *client* side.

As time passed more complex backens were added to cater for more specific needs: 

* Starting with v1.5.2 a new backend based on buckets was added to break the latency and throughput barrier imposed by mongodb 
  insert and update/remove: several elements are packed ina singel mongodb document, thus providing a much greater throughput; the price to pay is a slightly worse durability on catasthrophic events (see [here](/docs/usage/buckets))
* On v1.6.0 Pipelines were added: pipelines are based on queues where moving elements to one queue to another is totally atomic, 
  thus allowing the creation of ETL-like graphs where moving from oen queue to the next is perfectly transcational (element guaranteed to end up in exactly one queue) (see [here](/docs/usage/pipelines/about))
* On v1.7.0 a new `mongo-stream` backend was added, which sits in between *job queue* (ie, a consume operation removes the message
  from queue) and *event stream* (ie, a single message can be consumed more than once). It is not a pure stream in the sense than 
  the nuber of possible consumers is limited (nd somewhat predefined), but it provides event funcionality for free if you already
  use mongodb, without having to add and maintain another subsystem (see [here](/docs/usage/streaming/stream-mongo))
