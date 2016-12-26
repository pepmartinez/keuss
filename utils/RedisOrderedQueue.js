'use strict';


var async = require ('async');

const _s_lua_code_push = `
  -- qname in KEYS[1]
  -- id in ARGV[1]
  -- mature-t in ARGV[2]
  -- val in ARGV[3]
  
  -- insert obj in hash by id
  redis.call ('HSET', 'jobq:q:ordered_queue:hash:' .. KEYS[1], ARGV[1], ARGV[3])
  
  -- insert id+mature in index
  return redis.call ('ZADD', 'jobq:q:ordered_queue:index:' .. KEYS[1], ARGV[2], ARGV[1])
`;

const _s_lua_code_pop = `
  -- qname in KEYS[1]
  
  -- get older (lower mature) id from index
  local z_res = redis.call ('ZRANGE', 'jobq:q:ordered_queue:index:' .. KEYS[1], 0, 0, 'WITHSCORES')
  
  if (z_res[1] == nil) then
    return nil
  end
  
  local id = z_res[1]
--  local mature = z_res[2]
  
  -- get val by id from hash
  local val = redis.call ('HGET', 'jobq:q:ordered_queue:hash:' .. KEYS[1], id)
  
  -- delete from index, hash
  redis.call ('ZREM', 'jobq:q:ordered_queue:index:' .. KEYS[1], id)
  redis.call ('HDEL', 'jobq:q:ordered_queue:hash:' .. KEYS[1], id)
  
  return { id, z_res[2], val }
`;


var _s_sha_push = undefined;
var _s_sha_pop =  undefined;

var _s_rediscl = undefined;

function _s_load (lua_code, done) {
  _s_rediscl.script ('load', lua_code, done);
}


class RedisOrderedQueue {
  constructor (name) {
    this._rediscl = _s_rediscl;
    this._name = name;
  }
  
  static init (rediscl, done) {
    _s_rediscl = rediscl;
    var self = this;
    async.series ([
      function (cb) {_s_load (_s_lua_code_push, cb)},
      function (cb) {_s_load (_s_lua_code_pop, cb)}
    ], function (err, res) {
      if (err) {
        return done (err);
      }
      
      _s_sha_push = res [0];
      _s_sha_pop =  res [1];
      
      console.log ('RedisOQ funcs loaded');
      
      done ();
    });
  }
  
  push (id, mature, obj, done) {
    var self = this;
    this._rediscl.evalsha (_s_sha_push, 1, this._name, id, mature, obj, function (err, res) {
      if (err) {
        if (err.message.split(' ')[0] == 'NOSCRIPT') {
          RedisOrderedQueue.init (_s_rediscl, function (err) {
            if (err) {
              return done (err);
            }
            
            self.push (id, mature, obj, done);
          });
        }
        else {
          done (err);
        }
      }
      else {
        // res is '1'
        done (null, res);
      }
    });
  }
  
  pop (done) {
    var self = this;
    this._rediscl.evalsha (_s_sha_pop, 1, this._name, function (err, res) {
      if (err) {
        if (err.message.split(' ')[0] == 'NOSCRIPT') {
          RedisOrderedQueue.init (_s_rediscl, function (err) {
            if (err) {
              return done (err);
            }
            
            self.pop (done);
          });
        }
        else {
          done (err);
        }
      }
      else {
        // res is [id, mature, text]
        done (null, res);
      }
    });
  }
  
  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (callback) {
  //////////////////////////////////
    this._rediscl.zcard ('jobq:q:ordered_queue:index:' + this._name,  callback);
  }
  
  
  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (callback) {
  //////////////////////////////////
    var now = new Date();
    this._rediscl.zcount ('jobq:q:ordered_queue:index:' + this._name, '-inf', now.getTime(), callback);
  }
  
  
  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (callback) {
  //////////////////////////////////
    var now = new Date();
    this._rediscl.zcount ('jobq:q:ordered_queue:index:' + this._name, now.getTime(), '+inf', callback);
  }
  
  
  //////////////////////////////////
  // get first 
  peek (callback) {
  //////////////////////////////////
    this._rediscl.zrange ('jobq:q:ordered_queue:index:' + this._name, 0, 0, 'WITHSCORES', callback);
  }
}


module.exports = RedisOrderedQueue;
