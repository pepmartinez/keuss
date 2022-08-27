---
id: no-signaller
title: Using no signaller
sidebar_label: Using no signaller
---

Even when using signallers, `pop` operations on queue never block or wait forever; waiting `pop` operations are anyway terminated after 15000 millisecs
or whatever specified in the `pollInterval` parameter) and silently re-initiated. That is, a `pop()` on an empty queue will appear blocked forever to
the caller, but behind the scenes it'll work pretty much as if it were doing a poll every 15 secs

If a signaller is used (or if a signaller other than `local` is used, if `push()` and `pop()` happen on different machines) the `pop()` will be awaken almost
immediately after the `push()`; if no signaller is used (or `local`is used, but the action happens in separated machines) `pop()` will behave exactly as if
it were doing a poll() internally;

Another way to put it is, `pop()` operations would have a maximum latency of `pollInterval` millisecs, but also provides a safe backup in the event of
signalling loss.
