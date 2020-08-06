---
id: shutdown
title: Shutdown
sidebar_label: Shutdown
---

It is a good practice to call [`close(cb)`](../api/factory#close-factory-close) on the factories to release all resources once you're done, or at shutdown if you want your shutdowns clean and graceful; also, you should loop over your queues and perform a [`drain()`](../api/queue#drain-drain-queue) on them before calling `close()` on their factories: this will ensure any un-consumed data is popped, and any unwritten data is written. Also, it'll ensure all your (local) waiting consumers will end (on 'cancel' error).

:::note
Factories do not keep track of the created Queues, so this can't be done internally as part of the `close()`; this may change in the future.
:::