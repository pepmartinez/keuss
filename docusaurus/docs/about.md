---
id: about
title: About
sidebar_label: About
slug: /
---

Keuss is an attempt or experiment to provide a serverless, persistent and high-available queue middleware supporting delays/schedule, using mongodb and redis to provide most of the backend needs. As of now, it has evolved into a rather capable and complete queue middleware.

The underlying idea is that the key to provide persistency, HA and load balance is to rely on a storage subsystem that provides that, and build the rest on top. Instead of reinventing the wheel by building such as storage I simply tried to adapt what's already out there.

Modelling a queue with mongodb, for example, proved easy enough. It resulted simple, cheap and provides great persistency, HA and decent support for load balancing. Although using Redis provided similar results, in both cases the load balancing part was somewhat incomplete: the whole thing lacked a *bus* to signal all clients about, for example, when an insertion in a particular queue takes place. Without this layer a certain amount of polling is needed, so it's obviously a Nice Thing To Have.

Keuss ended up being a somewhat *serverless* queue system, where the *server* or common parts are bare storage systems such as redis or mongodb. There is no need for any extra *keuss server* in between clients and storage (although an actual keuss-server does exist, serving a different purpose on top of plain keuss). Thus, all keuss actually lays at the *client* side.
