
var Redis = require ('ioredis');
var _ =     require ('lodash');


function conn (opts) {
  if (!opts) opts = {};

  if (_.isFunction (opts)) {
    return opts ();
  }

  if (opts.Cluster) {
    return new Redis.Cluster (opts.Cluster);
  }

  if (opts.Redis) {
    return new Redis (opts.Redis);
  }

  return new Redis (opts);
}


module.exports = {
  conn: conn
};
