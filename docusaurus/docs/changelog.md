---
id: changelog
title: Changelog
sidebar_label: Changelog
---
* v1-6-2
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
