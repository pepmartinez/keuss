---
id: redis-conns
title: Redis Connections
sidebar_label: Redis Connections
---

Keuss relies on [ioredis](https://www.npmjs.com/package/ioredis) for connecting to redis. Anytime a redis connection is needed, keuss will create it from the opts object passed:

* If `opts` is a function, it is executed. It is expected to return a redis connection
* If it's an object and contains a `Redis` field, this field is used to create a new [ioredis Redis object](https://github.com/luin/ioredis), as in *return new Redis (opts.Redis)*
* if it's an object and contains a `Cluster` field, this field is used to create a new [ioredis Redis.Cluster](https://redis.io/topics/cluster-spec) object, as in *return new Redis.Cluster (opts.Cluster)*
* Else, a ioredis Redis object is created with `opts` as param, as in *return new Redis (opts)*

This apparent complexity is required since redis connections are inherently created in a different way for standalone, sentinel and cluster servers

## Examples:

* Default options:

  ```javascript
  var MQ = require ('keuss/backends/redis-list');
  var factory_opts = {};

  MQ (factory_opts, (err, factory) => {
    ...
  });
  ```

* Specific redis params for ioredis Redis client:

  ```javascript
  var MQ = require ('keuss/backends/redis-list');
  var factory_opts = {
    redis: {
      Redis: {
        port: 12293,
        host: 'some-redis-instance.somewhere.com',
        family: 4,
        password: 'xxxx',
        db: 0
      }
    }
  };

  MQ (factory_opts, (err, factory) => {
    ...
  });
  ```

* Using a factory function:

  ```javascript
  const MQ = require ('keuss/backends/redis-list');
  const Redis = require ('ioredis');
  const factory_opts = {
    redis: function () {
      return new Redis ({
        port: 12293,
        host: 'some-redis-instance.somewhere.com',
        family: 4,
        password: 'xxxx',
        db: 0
      })
    }
  };

  MQ (factory_opts, (err, factory) => {
    ...
  });
  ```
