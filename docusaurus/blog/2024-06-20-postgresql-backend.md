---
title: Supporting queues on Postgresql
author: Pep Martinez
author_url: https://github.com/pepmartinez
tags: [postgresql]
---

Version 2.0 of Keuss comes with a new member for the supported backend family: PostgreSQL can be now used as a backend
to create queues in tables of this RDBMS databases. Although not as performant as the other backends, we think it still
achieve a fairly decent throughput, plus it gains the benefits of using this popular database engine:

- Robust transactional support. PostgreSQL is fully ACID compliance, which may be appealing is some cases
- PostgreSQL has a broader adoption in tech companies, has extensive support and resources, and a strong community
- Reliability and maturity: PostgreSQL has been around for a long time now, and has a long track of reliability records
which may be appealing to some organizations, especially risk-averse ones.
- Strong cloud adoption

Implementing it added some challenges, due to the nature of PostgreSQL, and we needed to change the way in which we initialized
the queue system, so we added some breaking changes to `factory.queue()` method, which is now asynchronous, and requires a callback.

## Functionality

The `postgres` backend functionality is on par with that of `mongo`:

- at-least-once (reserve-commit-rollback) with optional delays on rollback
- scheduling (with no interference or degradation)
- removal of elements by id

## Requisites

In order to implement a Keuss queue using PostgreSQL as backend, you only need to provide an user with access to a PostgreSQL database with granted permissions to create tables and indexes on the database, as well as connection, query and update permissions over the tables in the db

## Performance

Performance is far from that provided by mongo or redis backends, but it's still quite impressive for a SQL backend: it operates at a few hundred queue-ops per second

Here's a quite simple test comparison: we're running everything in `localhost` (i.e.: no latency), using 3 concurrent clients on a intel i5 gen8; we push 100K messages and then pop them (one run with at-most-once `pop()`, another run with at-least-once `reserve()+commit()`):

|  backend           |  op          | time   |  TPS  |
|:-------------------|:-------------|-------:|------:|
|  mongo             | push         |   16s  |  6250 |
|                    | pop          |   30s  |  3333 |
|                    | rsv+commit   |   51s  |  1960 |
|  redis-oq          | push         |    5s  | 20000 |
|                    | pop          |    6s  | 16666 |
|                    | rsv+commit   |   12s  |  8888 |
|  redis-list        | push         |    4s  | 25000 |
|                    | pop          |    5s  | 20000 |
|                    | rsv+commit   |   n/a  |   n/a |
|  bucket-mongo-safe | push         |   3s   | 33333 |
|                    | pop          |    6s  | 16666 |
|                    | rsv+commit   |    4s  | 25000 |
|  postgres          | push         | 2m40s  |   625 |
|                    | pop          | 2m27s  |   680 |
|                    | rsv+commit   | 5m35s  |   298 |

As you can see, figures for `postgres` are on a lower magnitude than the others (especially redis and buckets) but they are
still pretty decent
