---
id: buckets
title: Bucket-based backends
sidebar_label: Bucket-based backends
---

Up to version 1.4.X all backends worked in the same way, one element at a time: pushing and popping elements fired one or more operations per element on the underlying storage. This means the bottleneck would end up being the storage's I/O; redis and mongo both allow quite high I/O rates, enough to work at thousands of operations per second. Still, the limit was there.

Starting with v1.5.2 keuss includes 2 backends that do not share this limitation: they work by packing many elements inside a single 'storage unit'. Sure enough, this adds some complexity and extra risks, but the throughput improvement is staggering: on mongodb it goes from 3-4 Ktps to 35-40Ktps, and the bottleneck shifted from mongod to the client's cpu, busy serializing and deserializing payloads.

Two bucked-based backends were added, both based on mongodb: [bucket-mongo](#bucket-mongo) and [bucket-mongo-safe](#bucket-mongo-safe). Both are usable, but there is little gain on using fhe first over the second: `bucket-mongo` was used as a prototyping area, and although perfectly usable, it turned out `bucket-mongo-safe` is better in almost every aspect: it provides better guarantees and more features, at about the same performance.

### bucket-mongo-safe
In addition to the general options, the factory accepts the following extra options:
* `bucket_max_size`: maximum number of elements in a bucket, defaults to 1024
* `bucket_max_wait`: milliseconds to wait before flushing a push bucket: pushes are buffered in a push bucket, which are flushed when they're full (reach `bucket_max_size` elements). If this amount of millisecs go by and the push bucket is not yet full, it is flushed as is. Defaults to 500.
* `reserve_delay`: number of seconds a bucket keeps its 'reserved' status when read from mongodb. Defaults to 30.
* `state_flush_period`: changes in state on each active/read bucket are flushed to mongodb every those milliseconds. Defaults to 500.
* `reject_delta_base`, `reject_delta_factor`: if no call to `ko` provide a `next_t`, the backend will set one using a simple grade-1 polynom, in the form of `reject_delta_factor * tries + reject_delta_base`, in millisecs. They default to `10000` and `((reserve_delay * 1000) || 30000)` respectively
* `reject_timeout_grace`: number of seconds to wait since a bucket is reserved/read until it is considered timed out; after this, what is left of the bucket is rejected/retried. Defaults to (`reserve_delay` * `0.8`)
* `state_flush_period`: flush intermediate state changes in each active read bucked every this amount of millisecs

Bucket-mongo-safe works by packing many payloads in a single mongodb object:
* At `push()` time, objects are buffered in memory and pushed (inserted) only when bucket_max_size has been reached or when a bucket has been getting filled for longer than bucket_max_wait millisecs.
* At `pop/reserve` time full objects are read into mem, and then individual payloads returned from there. Both commits and pops are just marked in memory and then flushed every state_flush_period millisecs, or when the bucked is exhausted.
* Buckets remain unmodified since they are created in terms of the payloads they contain: a `pop()` or `ko/ok` would only mark payloads inside buckets as read/not-anymore-available, but buckets are never splitted nor merged.

Thus, it is important to call `drain()` on queues of this backend: this call ensures all pending write buckets are interted in mongodb, and also ensures all in-memory buckets left are completely read (served through pop/reserve).

Also, there is little difference in performance and I/O between `pop` and `reserve/commit`; performance is no longer a reason to prefer one over the other.

:::note
Scheduling on `bucket-mongo-safe` is perfectly possible, but with a twist: the effective `mature_t` of a message will be the oldest in the whole bucket it resides in. This applies to both insert and rollback/ko. In practice this is usually not a big deal, since anyway the `mature_t` is a 'not before' time, and that's all Keuss (or any other queuing middleware) would guarantee.
:::

### bucket-mongo
This is a simpler version of buckets-on-mongodb, and for all purposes `bucket-mongo-safe` should be preferred; it does not provide reserve, nor schedule. It is however a tad faster and lighter on I/O.

It is provided only for historical and educational purposes.