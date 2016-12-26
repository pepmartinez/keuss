
var Redis = require ('ioredis');

function conn (opts) {
  if (!opts) opts = {};

  if (!opts.retryStrategy) {
    opts.retryStrategy = function (times) {
      console.log ('redis-conn: redis reconnect!, retry #%d', times);
      return Math.min (times * (opts.retry_factor || 15), (opts.retry_max || 15000));
    };
  }

  if (!opts.reconnectOnError) {
    opts.reconnectOnError = function (err) {return true;};
  }

  var rediscl = new Redis (opts);

/*    
  rediscl.on ('ready',        function ()    {console.log ('RedisConn: rediscl ready');});
  rediscl.on ('connect',      function ()    {console.log ('RedisConn: rediscl connect');});
  rediscl.on ('reconnecting', function ()    {console.log ('RedisConn: rediscl reconnecting');});
  rediscl.on ('error',        function (err) {console.log ('RedisConn: rediscl error: ' + err);});
  rediscl.on ('end',          function ()    {console.log ('RedisConn: rediscl end');});
*/
 
  return rediscl;
}


module.exports = {
  conn: conn
};
