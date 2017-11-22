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
  -- mature_mark in ARGV[1]
  
  -- get older (lower mature) id from index
  local z_res = redis.call ('ZRANGE', 'keuss:q:ordered_queue:index:' .. KEYS[1], 0, 0, 'WITHSCORES')
  
  if (z_res[1] == nil) then
    return nil
  end
  
  local id = z_res[1]
  local mature = z_res[2]

  if (mature > ARGV[1]) then
    -- head is not mature, just end
    return nil
  end
  
  -- get val by id from hash
  local val = redis.call ('HGET', 'keuss:q:ordered_queue:hash:' .. KEYS[1], id)

  if (string.sub (val, 1,2) == '* ') then
    -- already reserved one
    val = string.sub (val, 2)
  end 

  -- delete from index, hash
  redis.call ('ZREM', 'keuss:q:ordered_queue:index:' .. KEYS[1], id)
  redis.call ('HDEL', 'keuss:q:ordered_queue:hash:' .. KEYS[1], id)
  
  return { id, z_res[2], val }
`;

const _s_lua_code_reserve = `
  -- qname in KEYS[1]
  -- mature_mark in ARGV[1]
  -- incr_t in ARGV[2]

  -- get older (lower mature) id from index
  local z_res = redis.call ('ZRANGE', 'keuss:q:ordered_queue:index:' .. KEYS[1], 0, 0, 'WITHSCORES')
  
  if (z_res[1] == nil) then
    return nil
  end
  
  local id = z_res[1]
  local mature = z_res[2]

  if (mature > ARGV[1]) then
    -- head is not mature, just end
    return nil
  end

  -- increment score
  redis.call ('ZINCRBY', 'keuss:q:ordered_queue:index:' .. KEYS[1], ARGV[2], id)
  
  -- get val by id from hash
  local val = redis.call ('HGET', 'keuss:q:ordered_queue:hash:' .. KEYS[1], id)

  if (string.sub (val, 1,2) == '* ') then
    -- already reserved one
    val = string.sub (val, 2)
  else  
    -- mark val in hash as 'reserved'
    redis.call ('HSET', 'keuss:q:ordered_queue:hash:' .. KEYS[1], id, '* ' .. val)
  end

  return { id, z_res[2], val }
`;

const _s_lua_code_commit = `
  -- qname in KEYS[1]
  -- id in ARGV[1]
  
  local id = ARGV[1]
  local val = redis.call ('HGET', 'keuss:q:ordered_queue:hash:' .. KEYS[1], id)
  
  if (val == nil) then
    return nil
  end

  -- check if it was reserved
  if (string.sub (val, 1,2) ~= '* ') then
    -- not a reserved one
    return nil
  end

  -- delete from index, hash
  redis.call ('ZREM', 'keuss:q:ordered_queue:index:' .. KEYS[1], id)
  redis.call ('HDEL', 'keuss:q:ordered_queue:hash:' ..  KEYS[1], id)

  return id
`;

const _s_lua_code_rollback = `
  -- qname in KEYS[1]
  -- id in ARGV[1]
  -- new_t in ARGV[2]
  
  local id = ARGV[1]
  local val = redis.call ('HGET', 'keuss:q:ordered_queue:hash:' .. KEYS[1], id)
  
  if (val == nil) then
    return nil
  end
  
  if (string.sub (val, 1,2) ~= '* ') then
    -- not a reserved one
    return nil
  end

  -- reset score
  redis.call ('ZADD', 'keuss:q:ordered_queue:index:' .. KEYS[1], 'XX', ARGV[2], id)

  -- reset val
  redis.call ('HSET', 'keuss:q:ordered_queue:hash:' .. KEYS[1], id, string.sub (val, 2))

  return id
`;



class RedisOrderedQueue {
  constructor (name, factory) {
    this._factory = factory;
    this._rediscl = factory._rediscl;
    this._name = name;
  }
  
  //////////////////////////////////
  push (id, mature, obj, done) {
  //////////////////////////////////
    this._rediscl.roq_push (this._name, id, mature, obj, function (err, res) {
      if (err) return done (err);
      
      // res is 1
      done (null, res);
    });
  }
  
  //////////////////////////////////
  pop (done) {
  //////////////////////////////////
    this._rediscl.roq_pop (this._name, new Date().getTime (), function (err, res) {
      if (err) return done (err);

      // res is [id, mature, text]
      done (null, res);
    });
  }
  
  //////////////////////////////////
  reserve (incr, done) {
  //////////////////////////////////
    this._rediscl.roq_reserve (this._name, new Date().getTime (), incr, function (err, res) {
      if (err) return done (err);
  
      // res is [id, mature, text]
      done (null, res);
    });
  }
  
  //////////////////////////////////
  commit (id, done) {
  //////////////////////////////////
    this._rediscl.roq_commit (this._name, id, function (err, res) {
      if (err) return done (err);
  
      // res is id
      done (null, res);
    });
  }
  
  //////////////////////////////////
  rollback (id, done) {
  //////////////////////////////////
    this._rediscl.roq_rollback (this._name, id, new Date().getTime (), function (err, res) {
      if (err) return done (err);
  
      // res is id
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
    this._rediscl.zcount ('keuss:q:ordered_queue:index:' + this._name, '-inf', new Date().getTime(), callback);
  }
  
  
  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
  //////////////////////////////////
    this._rediscl.zcount ('keuss:q:ordered_queue:index:' + this._name, new Date().getTime(), '+inf', callback);
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
    
    this._rediscl.defineCommand('roq_push',     {numberOfKeys: 1, lua: _s_lua_code_push});
    this._rediscl.defineCommand('roq_pop',      {numberOfKeys: 1, lua: _s_lua_code_pop});
    this._rediscl.defineCommand('roq_reserve',  {numberOfKeys: 1, lua: _s_lua_code_reserve});
    this._rediscl.defineCommand('roq_commit',   {numberOfKeys: 1, lua: _s_lua_code_commit});
    this._rediscl.defineCommand('roq_rollback', {numberOfKeys: 1, lua: _s_lua_code_rollback});
  }

  roq (name) {
    return new RedisOrderedQueue (name, this);
  }
}

module.exports = Factory;
