---
title: Supporting queues on Postgresql
author: Pep Martinez
author_url: https://github.com/pepmartinez
tags: [postgresql]
---

Version 2.0 of Keuss comes with a new member for the supported backend family: postgresql can be now used as a backend
to create queues in tables of this RDBMS databases. Altought not as performant as the other backends, we think it still
achieve a fairly decent throughput, plus it gains the benefits of using this popular database engine:

- Robust transactional support. Postgresql is fully ACID compliance, which may be appealing is some cases
- Postgresql has a broader adoption in tech companies, has extensive support and resources, and a strong community
- Reliability and maturity: Postgresql has been around for a long time now, and has a long track of reliability records
which may be appealing to some organizations, specialy risk-averse ones.
- Strong cloud adoption

Implementing it added some challenges, due to the nature of Postgresql, and we needed to change the way in which we initialized
the queue system, so we added some breaking changes to `factory.queue()` method, which is now asynchronous, and requires a callback.
