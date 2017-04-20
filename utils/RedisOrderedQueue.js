'use strict';

const _s_lua_code_push = `
  -- qname in KEYS[1]
  -- id in ARGV[1]
  -- mature-t in ARGV[2]
  -- val in ARGV[3]
  
  -- insert obj in hash by id
  redis.call ('HSET', 'keuss:q:ordered_queue:hash:' .. KEYS[1], ARGV[1], ARGV[3])
  
  -- insert id+mature in index
  return redis.call ('ZADD', 'keuss:q:ordered_queue:index:' .. KEYS[1], ARGV[2], ARGV[1])
`;

const _s_lua_code_pop = `
  -- qname in KEYS[1]
  
  -- get older (lower mature) id from index
  local z_res = redis.call ('ZRANGE', 'keuss:q:ordered_queue:index:' .. KEYS[1], 0, 0, 'WITHSCORES')
  
  if (z_res[1] == nil) then
    return nil
  end
  
  local id = z_res[1]
--  local mature = z_res[2]
  
  -- get val by id from hash
  local val = redis.call ('HGET', 'keuss:q:ordered_queue:hash:' .. KEYS[1], id)
  
  -- delete from index, hash
  redis.call ('ZREM', 'keuss:q:ordered_queue:index:' .. KEYS[1], id)
  redis.call ('HDEL', 'keuss:q:ordered_queue:hash:' .. KEYS[1], id)
  
  return { id, z_res[2], val }
`;


class RedisOrderedQueue {
  constructor (name, factory) {
    this._factory = factory;
    this._rediscl = factory._rediscl;
    this._name = name;
  }
  
  push (id, mature, obj, done) {
    this._rediscl.roq_push (this._name, id, mature, obj, function (err, res) {
      if (err) return done (err);
      
      // res is 1
      done (null, res);
    });
  }
  
  pop (done) {
    this._rediscl.roq_pop (this._name, function (err, res) {
      if (err) return done (err);

      // res is [id, mature, text]
      done (null, res);
    });
  }
  
  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback) {
  //////////////////////////////////
    this._rediscl.zcard ('keuss:q:ordered_queue:index:' + this._name,  callback);
  }
  
  
  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
  //////////////////////////////////
    var now = new Date();
    this._rediscl.zcount ('keuss:q:ordered_queue:index:' + this._name, '-inf', now.getTime(), callback);
  }
  
  
  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
  //////////////////////////////////
    var now = new Date();
    this._rediscl.zcount ('keuss:q:ordered_queue:index:' + this._name, now.getTime(), '+inf', callback);
  }
  
  
  //////////////////////////////////
  // get first 
  peek (callback) {
  //////////////////////////////////
    this._rediscl.zrange ('keuss:q:ordered_queue:index:' + this._name, 0, 0, 'WITHSCORES', callback);
  }
}


class Factory {
  constructor (rediscl) {
    this._rediscl = rediscl;
    
    this._rediscl.defineCommand('roq_push', {
      numberOfKeys: 1,
      lua: _s_lua_code_push
    });

    this._rediscl.defineCommand('roq_pop', {
      numberOfKeys: 1,
      lua: _s_lua_code_pop
    });
  }

  roq (name) {
    return new RedisOrderedQueue (name, this);
  }
}

module.exports = Factory;
