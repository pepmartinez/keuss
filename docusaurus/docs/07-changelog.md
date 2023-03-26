---
id: changelog
title: Changelog
sidebar_label: Changelog
---
* v1.7.1
  * added intraorder backend
* v1.7.0:
  * added stream-mongo backend
* v1.6.14:
  * fixed typo bug at redis-pubsub signaller introspection
* v1.6.13:
  * added some more information to Queue.status(), pertaining the queue-factory
* v1.6.12:
  * use mongodb driver v4 (v4.5.0), which forced a small number of internal changes
  * use ioredis v5
* v1.6.11
  * better hdrs management on passing messages to deadletter
* v1.6.10
  * updated deps
  * add 'deadletter' to stats, for elements moved to deadletter queue
* v1.6.9
  * fix glitch in remove item on tape mongo (ps-mongo)
* v1.6.8
  * added remove-by-id support 
* v1.6.7
  * small fix on deadetter signalling   
* v1.6.6
  * added reserve, commit, rollback counters to stats
  * fixed mongo-driver deprecation
* v1.6.5
  * dependencies updated
* v1.6.4
  * dependencies updated
* v1.6.3
  * added support for headers (along with payload)
* v1.6.2
  * payload can be of type object, string, number of buffer
* v1.6.1
  * added Docusaurus based documentation
  * fixed deps' vulnerabilities
* v1.6.0
  * added sane defaults for stats and signal for mongodb-based backends (using mongo stats and signal)
  * added pipeline builder
  * added ability to create a full pipeline from text (making it trivial to be stored in file)
* v1.5.12
  * corrected small pipeline-related issues
* v1.5.11 (void)
* v1.5.10
  * pipelines overhaul
  * mubsub change to @nodebb/mubsub
* v1.5.9:
  * added some complete, meaningful examples
* v1.5.8
  * added deadletter support
* v1.5.7
  * added resvSize support
* v1.5.4:
  * added pause support
  * deps updated
* v1.5.3:
  * use mongodb driver v3.2 (was v2.2)
* v1.5.2
  * added bucket-based backends: 2 backends using buckets/buffering on top of mongodb
