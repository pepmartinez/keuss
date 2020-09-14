---
id: queue
title: Queue API
sidebar_label: Queue
---

### `stats`: Queue stats

```javascript
q.stats ((err, res) => {
  ...
})
```

* `res` contains usage statistics (elements inserted, elements extracted, paused status).

### `name`: Queue name

```javascript
var qname = q.name ()
```

### `type`: Queue type

```javascript
var qtype = q.type ()
```

Returns a string with the type of the queue (the type of backend which was used to create it).

### `size`: Queue occupation

```javascript
q.size ((err, res) => {
  ...
})
```

Returns the number of elements in the queue that are already elligible (that is, excluding scheduled elements with a schedule time in the future).

### `totalSize`: Total queue occupation

```javascript
q.totalSize ((err, res) => {
  ...
})
```

Returns the number of elements in the queue (that is, including scheduled elements with a schedule time in the future).

### `schedSize`: Size of Scheduled

```javascript
q.schedSize ((err, res) => {
  ...
})
```

Returns the number of scheduled elements in the queue (that is, those with a schedule time in the future). Returns 0 if the queue does not support scheduling.

### `resvSize`: Reserved elements size

```javascript
q.resvSize ((err, res) => {
  ...
})
```

Returns the number of reserved elements in the queue. Returns `null` if the queue does not support reserve.

### `pause` / `paused`: Pause/Resume

```javascript
// pauses the queue
q.pause (true)

// resumes the queue
q.pause (false)

// gets paused status of queue
q.paused ((err, is_paused) => {
  ...
})
```

Pauses/Resumes all consumers on this queue (calls to `pop()`). Producers are not afected (calls to `push()`).

The pause/resume condition is propagated via the signallers, so this affects all consumers, not only those local to the process, if a redis-pubsub or mongo-capped signaller is used.

Also, the paused condition is stored as stats, so any new call to `pop()` will honor it.

### `next_t`: Time of schedule of next message

```javascript
q.next_t ((err, res) => {
  ...
})
```

Returns a `Date`, or `null` if queue is empty. Queues with no support for schedule/delay always return `null 

### `push`: Add element to queue

```javascript
q.push (payload, [opts,] (err, res) => {
  ...
})
```

Adds payload to the queue and calls passed callback upon completion. Callback's *res* will contain the id assigned to the inserted element, if the backup provides one.

Possible opts:

* `mature`: unix timestamp where the element would be elligible for extraction. It is guaranteed that the element won't be extracted before this time.
* `delay`: delay in seconds to calculate the mature timestamp, if mature is not provided. For example, a delay=120 guarantees the element won't be extracted until 120 secs have elapsed *at least*.
* `tries`: value to initialize the retry counter, defaults to 0 (still no retries).

:::note
**mature** and **delay** have no effect if the backend does not support delay/schedule.
:::

### `pop`: Get element from queue

```javascript
var tr = q.pop (cid, [opts,] (err, res) => {
  ...
})
```

Obtains an element from the queue. Callback is called with the element obtained if any, or if an error happened. If defined, the operation will wait for `opts.timeout` seconds for an element to appear in the queue before bailing out (with both `err` and `res` being null). However, it immediately returns an id that can be used to cancel the operation at anytime.

`*cid*` is an string that identifies the consumer entity; it is used only for debugging purposes.

Possible opts:

* **timeout**: milliseconds to wait for an elligible element to appear in the queue to be returned. If not defined it will wait forever
* **reserve**: if `true` the element is only reserved, not completely returned. This means either *ok* or *ko* operations are needed upon the obtained element once processed, otherwise the element will be rolled back (and made available again) at some point in the future (this is only available on backends capable of reserve/commit).

### `cancel`: Cancel a pending Pop

```javascript
var tr = q.pop (cid, opts, (err, res) => {...});
.
.
.
q.cancel (tr);
```

Cancels a pending `pop` operation, identified by the value returned by `pop()`

If no `tr` param is passed, or it is `null`, all pending `pop` operations on the queue are cancelled. Cancelled `pop` operations will get `'cancel'` (a string) in the `error` parameter value of the callback.

### `ok`: Commit a reserved element

```javascript
q.ok (id, (err, res) => {
  ...
})
```

Commits a reserved element by its id (the id would be assigned to `res._id` on the `res` param of `pop()` operation). This effectively erases the element from the queue.

Alternatively, you can pass the entire `res` object from the `pop()` operation:

```javascript
var tr = q.pop ('my-consumer-id', {reserve: true}, (err, res) => {
  // do something with res
  ...

  // commit it
  q.ok (res, (err, res) => {
    ...
  });
});
```

### `ko`: Roll back a reserved element

```javascript
q.ko (id, next_t, (err, res) => {
  ...
})
```

Rolls back a reserved element by its id (the id would be at `res._id` on the `res` param of `pop()` operation). This effectively makes the element available again at the queue, marking it to be mature at `next_t` (`next_t` being a millsec-unixtime). If no `next_t` is specified or a `null` is passed, `now()` is assumed.

As with `ok()`, you can use the entire `res` object instead:

```javascript
var tr = q.pop ('my-consumer-id', {reserve: true}, (err, res) => {
  // do something with res
  ...

  // commit or rollback it
  if (succeed) q.ok (res, (err, res) => {
    ...
  })
  else q.ko (res, (err, res) => {
    ...
  })
});
```

:::important
You must pass the entire `res` object for the [deadletter](../api/factory#dead-letter) feature to work; even if activated at the factory, `ko()` will not honor deadletter if you only pass the `res._id` as `id`.
:::

### `drain`: Drain queue

```javascript
q.drain (err => {
  ...
})
```

Drains a queue. This is a needed operation when a backend does read-ahead upon a `pop()`, or buffers `push()` operations for later; in this case, you may want to be sure that all extra elemens read are actually popped, and all pending pushes are committed.

:::warning
'drain' will immediately inhibit `push()`: any call to `push()` will immediately result in a `'drain'` (a string)  in the `error` parameter value of the callback. The callback will be called when all pending pushes are committed, and all read-ahead on a pop() has been actually popped.
:::
Also, `drain()` will also call `cancel()` on the queue immediately before finishing, in case of success.
