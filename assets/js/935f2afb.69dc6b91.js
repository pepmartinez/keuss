"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[53],{1109:e=>{e.exports=JSON.parse('{"pluginId":"default","version":"current","label":"Next","banner":null,"badge":false,"noIndex":false,"className":"docs-version-current","isLast":true,"docsSidebars":{"tutorialSidebar":[{"type":"link","label":"About","href":"/keuss/docs/","docId":"about"},{"type":"link","label":"Quickstart","href":"/keuss/docs/quickstart","docId":"quickstart"},{"type":"link","label":"Concepts","href":"/keuss/docs/concepts","docId":"concepts"},{"type":"category","label":"Usage","collapsible":true,"collapsed":true,"items":[{"type":"link","label":"Putting all together","href":"/keuss/docs/Usage/putting-all-together","docId":"Usage/putting-all-together"},{"type":"link","label":"Redis Connections","href":"/keuss/docs/Usage/redis-conns","docId":"Usage/redis-conns"},{"type":"link","label":"Shutdown","href":"/keuss/docs/Usage/shutdown","docId":"Usage/shutdown"},{"type":"link","label":"Using no signaller","href":"/keuss/docs/Usage/no-signaller","docId":"Usage/no-signaller"},{"type":"link","label":"Bucket-based backends","href":"/keuss/docs/Usage/buckets","docId":"Usage/buckets"},{"type":"category","label":"Pipelines","collapsible":true,"collapsed":true,"items":[{"type":"link","label":"About","href":"/keuss/docs/Usage/Pipelines/about","docId":"Usage/Pipelines/about"},{"type":"link","label":"Processors","href":"/keuss/docs/Usage/Pipelines/processors","docId":"Usage/Pipelines/processors"},{"type":"link","label":"Building","href":"/keuss/docs/Usage/Pipelines/building","docId":"Usage/Pipelines/building"},{"type":"link","label":"Examples","href":"/keuss/docs/Usage/Pipelines/examples","docId":"Usage/Pipelines/examples"}]},{"type":"category","label":"Streaming","collapsible":true,"collapsed":true,"items":[{"type":"link","label":"Stream-mongo backend","href":"/keuss/docs/Usage/Streaming/stream-mongo","docId":"Usage/Streaming/stream-mongo"}]},{"type":"category","label":"Experiments-and-Curiosities","collapsible":true,"collapsed":true,"items":[{"type":"link","label":"Map of Strict Ordered Queues","href":"/keuss/docs/Usage/Experiments-and-Curiosities/map-of-strict-ordered-queues","docId":"Usage/Experiments-and-Curiosities/map-of-strict-ordered-queues"}]}]},{"type":"link","label":"Examples","href":"/keuss/docs/examples","docId":"examples"},{"type":"category","label":"API","collapsible":true,"collapsed":true,"items":[{"type":"link","label":"Factory","href":"/keuss/docs/API/factory","docId":"API/factory"},{"type":"link","label":"Queue","href":"/keuss/docs/API/queue","docId":"API/queue"},{"type":"link","label":"Signaller","href":"/keuss/docs/API/signal","docId":"API/signal"},{"type":"link","label":"Stats","href":"/keuss/docs/API/stats","docId":"API/stats"}]},{"type":"link","label":"Changelog","href":"/keuss/docs/changelog","docId":"changelog"}]},"docs":{"about":{"id":"about","title":"About","description":"Keuss is an attempt or experiment to provide a serverless, persistent and high-available queue middleware supporting delays/schedule, using mongodb and redis to provide most of the backend needs. As of now, it has evolved into a rather capable and complete queue middleware.","sidebar":"tutorialSidebar"},"API/factory":{"id":"API/factory","title":"Factory API","description":"Backends, which work as queue factories, have the following operations:","sidebar":"tutorialSidebar"},"API/queue":{"id":"API/queue","title":"Queue API","description":"stats: Queue stats","sidebar":"tutorialSidebar"},"API/signal":{"id":"API/signal","title":"Signaller API","description":"Signaler factory","sidebar":"tutorialSidebar"},"API/stats":{"id":"API/stats","title":"Stats API","description":"Stats factories","sidebar":"tutorialSidebar"},"changelog":{"id":"changelog","title":"Changelog","description":"* v1.7.1","sidebar":"tutorialSidebar"},"concepts":{"id":"concepts","title":"Concepts","description":"Queue","sidebar":"tutorialSidebar"},"examples":{"id":"examples","title":"Examples","description":"A set of funcioning examples can be found inside the examples directory:","sidebar":"tutorialSidebar"},"quickstart":{"id":"quickstart","title":"Quickstart","description":"Package Install","sidebar":"tutorialSidebar"},"Usage/buckets":{"id":"Usage/buckets","title":"Bucket-based backends","description":"Up to version 1.4.X all backends worked in the same way, one element at a time: pushing and popping elements fired one or more operations per element on the underlying storage. This means the bottleneck would end up being the storage\'s I/O; redis and mongo both allow quite high I/O rates, enough to work at thousands of operations per second. Still, the limit was there.","sidebar":"tutorialSidebar"},"Usage/Experiments-and-Curiosities/map-of-strict-ordered-queues":{"id":"Usage/Experiments-and-Curiosities/map-of-strict-ordered-queues","title":"Map of Strict Ordered Queues","description":"The problem","sidebar":"tutorialSidebar"},"Usage/no-signaller":{"id":"Usage/no-signaller","title":"Using no signaller","description":"Even when using signallers, pop operations on queue never block or wait forever; waiting pop operations are anyway terminated after 15000 millisecs","sidebar":"tutorialSidebar"},"Usage/Pipelines/about":{"id":"Usage/Pipelines/about","title":"About","description":"Pipelines is a Keuss extension for building ETL processing graphs with ease while guaranteeing atomicity in the processing: whatever happens at the processing of an element, the element is guaranteed to be in either the source or in the destination queue; never in both, never in none.","sidebar":"tutorialSidebar"},"Usage/Pipelines/building":{"id":"Usage/Pipelines/building","title":"Building Pipelines","description":"Pipelines can be built in 3 ways:","sidebar":"tutorialSidebar"},"Usage/Pipelines/examples":{"id":"Usage/Pipelines/examples","title":"Examples","description":"* simplest: a very simple pipeline with just 2 queues connected with a DirectLink","sidebar":"tutorialSidebar"},"Usage/Pipelines/processors":{"id":"Usage/Pipelines/processors","title":"Processors","description":"A small hierarchy of processors is provided with Pipelines:","sidebar":"tutorialSidebar"},"Usage/putting-all-together":{"id":"Usage/putting-all-together","title":"Putting all together","description":"Factory initialization","sidebar":"tutorialSidebar"},"Usage/redis-conns":{"id":"Usage/redis-conns","title":"Redis Connections","description":"Keuss relies on ioredis for connecting to redis. Anytime a redis connection is needed, keuss will create it from the opts object passed:","sidebar":"tutorialSidebar"},"Usage/shutdown":{"id":"Usage/shutdown","title":"Shutdown","description":"It is a good practice to call close(cb) on the factories to release all resources once you\'re done, or at shutdown if you want your shutdowns clean and graceful (the log-lived redis or mongodb connections are terminated here, for example); also, you should loop over your queues and perform a drain() on them before calling close() on their factories: this will ensure any un-consumed data is popped, and any unwritten data is written. Also, it\'ll ensure all your (local) waiting consumers will end (on \'cancel\' error).","sidebar":"tutorialSidebar"},"Usage/Streaming/stream-mongo":{"id":"Usage/Streaming/stream-mongo","title":"Stream-mongo backend","description":"stream-mongo is the result of a series of experiments to find out if implementing event streaming on top of mongodb with a","sidebar":"tutorialSidebar"}}}')}}]);