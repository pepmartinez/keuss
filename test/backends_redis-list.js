
var async =   require ('async');
var should =  require ('should');

var MQ = require ('../backends/redis-list');

var factory = null;

describe ('redis-list queue backend', function () {

  before (function (done) {
    var opts = {};

    MQ (opts, function (err, fct) {
      if (err) return done (err);
      factory = fct;
      done();
    });
  });
  
  
  after (function (done) {
    factory.close (done);
  });
  
  it ('queue is created empty and ok', function (done){
    var q = factory.queue('test_queue');
    should.equal (q.nextMatureDate (), null);
    q.name ().should.equal ('test_queue');
    
    async.series([
      function (cb) {q.stats(cb)},
      function (cb) {q.size (cb)},
      function (cb) {q.totalSize (cb)},
      function (cb) {q.next_t (cb)},
    ], function(err, results) {
      results.should.eql ([{get: 0, put: 0}, 0, 0, null])
      done();
    });
  });
  
  it ('sequential push & pops with no delay, go as expected', function (done){
    var q = factory.queue('test_queue');
    
    async.series([
      function (cb) {q.push ({elem:1, pl:'twetrwte'}, cb)},
      function (cb) {q.push ({elem:2, pl:'twetrwte'}, cb)},
      function (cb) {q.size (function (err, size) {
        size.should.equal (2);
        cb();
      })},
      function (cb) {q.stats (function (err, res) {
        res.should.eql ({get: 0, put: 2});
        cb();
      })},
      function (cb) {q.next_t (function (err, res) {
        should.equal (res, null);
        cb();
      })},
      function (cb) {q.pop ('c1', cb)},
      function (cb) {q.size (function (err, size) {
        size.should.equal (1);
        cb();
      })},
      function (cb) {q.stats (function (err, res) {
        res.should.eql ({get: 1, put: 2});
        cb();
      })},
      function (cb) {q.pop ('c2', cb)},
      function (cb) {q.size (function (err, size) {
        size.should.equal (0);
        cb();
      })},
      function (cb) {q.stats (function (err, res) {
        res.should.eql ({get: 2, put: 2});
        cb();
      })},
    ], function(err, results) {
      done();
    });
  });
  
  
  it ('sequential push & pops with delays, go as expected (delays are ignored)', function (done){
    var q = factory.queue('test_queue');
    
    async.series([
      function (cb) {q.push ({elem:1, pl:'twetrwte'}, {delay:2}, cb)},
      function (cb) {q.push ({elem:2, pl:'twetrwte'}, {delay:1}, cb)},
      function (cb) {q.size (function (err, size) {
        size.should.equal (2);
        cb();
      })},
      function (cb) {q.stats (function (err, res) {
        res.should.eql ({get: 0, put: 2});
        cb();
      })},
      function (cb) {q.pop ('c1', function (err, ret) {
        ret.payload.should.eql ({elem:1, pl:'twetrwte'});
        cb (err, ret);
      })},
      function (cb) {q.size (function (err, size) {
        size.should.equal (1);
        cb();
      })},
      function (cb) {q.stats (function (err, res) {
        res.should.eql ({get: 1, put: 2});
        cb();
      })},
      function (cb) {q.pop ('c2', function (err, ret) {
        ret.payload.should.eql ({elem:2, pl:'twetrwte'});
        cb (err, ret);
      })},
      function (cb) {q.size (function (err, size) {
        size.should.equal (0);
        cb();
      })},
      function (cb) {q.stats (function (err, res) {
        res.should.eql ({get: 2, put: 2});
        cb();
      })},
    ], function(err, results) {
      done();
    });
  });
  
  
  it ('pop cancellation works as expected', function (done){
    var q = factory.queue('test_queue');
    
    async.series([
      function (cb) {
        var tid1 = q.pop ('c1', {timeout: 2000}, function (err, ret) {should.equal(0,1)});
        q.consumers().length.should.equal (1);
        var tid2 = q.pop ('c2', {timeout: 2000}, function (err, ret) {should.equal(0,1)});
        q.nConsumers().should.equal (2);
        q.cancel (tid1);
        q.nConsumers().should.equal (1);
        q.cancel (tid2);
        q.nConsumers().should.equal (0);
        cb();
      },
      function (cb) {q.push ({elem:2, pl:'twetrwte'}, cb)},
      function (cb) {q.push ({elem:1, pl:'twetrwte'}, cb)},
      function (cb) {q.pop ('c3', {timeout: 15000}, function (err, ret) {
        ret.payload.should.eql ({elem:2, pl:'twetrwte'});
        cb (err, ret);
      })},
      function (cb) {q.pop ('c4', {timeout: 15000}, function (err, ret) {
        ret.payload.should.eql ({elem:1, pl:'twetrwte'});
        cb (err, ret);
      })},
      function (cb) {q.size (function (err, size) {
        size.should.equal (0);
        cb();
      })},
      function (cb) {q.stats (function (err, res) {
        res.should.eql ({get: 2, put: 2});
        cb();
      })},
    ], function(err, results) {
      done();
    });
  });

});
