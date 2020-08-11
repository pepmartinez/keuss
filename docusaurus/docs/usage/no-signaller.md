---
id: no-signaller
title: Using no signaller
sidebar_label: Using no signaller
---

Even when using signallers, `pop` operations on queue never block or wait forever; waiting `pop` operations rearm themselves every 15000 millisec (or whatever specified in the `pollInterval` parameter). This feature provides the ability to work with more than one process. 

Without signallers, `pop` operations have a maximum latency of `pollInterval` millisecs, but also provides a safe backup in the event of signalling loss.