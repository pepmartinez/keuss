
var async =   require ('async');
var should =  require ('should');

var LocalSignal = require ('../signal/local');
var MemStats =    require ('../stats/mem');

const MongoClient = require ('mongodb').MongoClient;

var factory = null;

[
  {label: 'MongoDB SafeBucket', mq: require ('../backends/bucket-mongo-safe')}
].forEach (function (MQ_item) {

describe ('bucket-at-least-once with ' + MQ_item.label + ' queue backend', function () {
  var MQ = MQ_item.mq;

  before (function (done) {
    var opts = {
      url: 'mongodb://localhost/keuss_test_bucket_at_least_once',
      signaller: { provider: LocalSignal},
      stats: {provider: MemStats}
    };

    MQ (opts, function (err, fct) {
      if (err) return done (err);
      factory = fct;
      done();
    });
  });


  after (done => async.series ([
    cb => setTimeout (cb, 1000),
    cb => factory.close (cb),
    cb => MongoClient.connect ('mongodb://localhost/keuss_test_bucket_at_least_once', (err, cl) => {
      if (err) return done (err);
      cl.db().dropDatabase (() => cl.close (cb))
    })
  ], done));


  it ('queue is created empty and ok', function (done){
    var q = factory.queue('test_queue_1');
    should.equal (q.nextMatureDate (), null);
    q.name ().should.equal ('test_queue_1');

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


  it ('sequential push & pops, go as expected', function (done){
    var q = factory.queue('test_queue_2');

    async.series([
      function (cb) {q.push ({elem:1, pl:'twetrwte'}, cb)},
      function (cb) {q.push ({elem:2, pl:'twetrwte'}, cb)},
      function (cb) {setTimeout (cb, 1111)},
      function (cb) {q.size (function (err, size) {
        size.should.equal (2);
        cb();
      })},
      function (cb) {q.stats (function (err, res) {
        res.should.eql ({get: 0, put: 2});
        cb();
      })},
      function (cb) {q.next_t (function (err, res) {
        res.getTime().should.be.approximately(new Date().getTime(), 2000);
        cb();
      })},
      function (cb) {q.pop ('c1', function (err, ret) {
        ret.payload.should.eql ({elem:1, pl:'twetrwte'});
        cb (err);
      })},
      function (cb) {q.size (function (err, size) {
        size.should.equal (0);
        cb();
      })},
      function (cb) {q.stats (function (err, res) {
        res.should.eql ({get: 1, put: 2});
        cb();
      })},
      function (cb) {q.pop ('c2', function (err, ret) {
        ret.payload.should.eql ({elem:2, pl:'twetrwte'});
        cb (err);
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
      q.drain();
      done();
    });
  });


  it ('pop cancellation works as expected', function (done){
    var q = factory.queue('test_queue_3');

    async.series([
      function (cb) {
        var tid1 = q.pop ('c1', {timeout: 2000}, function (err, ret) {err.should.equal('cancel')});
        q.consumers().length.should.equal (1);
        var tid2 = q.pop ('c2', {timeout: 2000}, function (err, ret) {err.should.equal('cancel')});
        q.nConsumers().should.equal (2);
        q.cancel (tid1);
        q.nConsumers().should.equal (1);
        q.cancel (tid2);
        q.nConsumers().should.equal (0);
        cb();
      },
      function (cb) {q.push ({elem:2, pl:'cancel-twetrwte'}, cb)},
      function (cb) {q.push ({elem:1, pl:'cancel-twetrwte'}, cb)},
      function (cb) {setTimeout (cb, 1111)},
      function (cb) {q.pop ('c3', {timeout: 15000}, function (err, ret) {
        ret.payload.should.eql ({elem:2, pl:'cancel-twetrwte'});
        cb (err, ret);
      })},
      function (cb) {q.pop ('c4', {timeout: 15000}, function (err, ret) {
        ret.payload.should.eql ({elem:1, pl:'cancel-twetrwte'});
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
      q.drain();
      done();
    });
  });


  it ('push & pop on 2 buckets ok', function (done) {
    var q = factory.queue('test_queue_4');

    async.series([
      (cb) => q.push ({elem:1, pl:'twetrwte'}, cb),
      (cb) => q.push ({elem:2, pl:'twetrwte'}, cb),
      (cb) => q.push ({elem:3, pl:'twetrwte'}, cb),
      (cb) => q.push ({elem:4, pl:'twetrwte'}, cb),
      (cb) => setTimeout (cb, 666),

      (cb) => q.size ((err, size) => {size.should.equal (4); cb(); }),
      (cb) => q.stats ((err, res) => {res.should.eql ({get: 0, put: 4}); cb(); }),

      (cb) => q.push ({elem:5, pl:'twetrwte'}, cb),
      (cb) => q.push ({elem:6, pl:'twetrwte'}, cb),
      (cb) => q.push ({elem:7, pl:'twetrwte'}, cb),
      (cb) => setTimeout (cb, 666),

      (cb) => q.size ((err, size) => {size.should.equal (7); cb(); }),
      (cb) => q.stats ((err, res) => {res.should.eql ({get: 0, put: 7}); cb(); }),

      (cb) => q.next_t ((err, res) => {res.getTime().should.be.approximately(new Date().getTime(), 2000); cb(); }),

      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:1, pl:'twetrwte'}); cb (err); })},
      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:2, pl:'twetrwte'}); cb (err); })},
      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:3, pl:'twetrwte'}); cb (err); })},
      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:4, pl:'twetrwte'}); cb (err); })},
      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:5, pl:'twetrwte'}); cb (err); })},
      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:6, pl:'twetrwte'}); cb (err); })},
      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:7, pl:'twetrwte'}); cb (err); })},

      (cb) => q.size ((err, size) => {size.should.equal (0); cb(); }),
      (cb) => q.stats ((err, res) => {res.should.eql ({get: 7, put: 7}); cb(); }),
    ], function(err, results) {
      q.drain();
      done();
    });
  });


  it ('push & pop with delay ok', function (done) {
    var q = factory.queue('test_queue_5');

    async.series([
      (cb) => q.push ({elem:1, pl:'twetrwte'}, {delay: 4}, cb),
      (cb) => q.push ({elem:2, pl:'twetrwte'}, {delay: 2}, cb),
      (cb) => q.push ({elem:3, pl:'twetrwte'}, {delay: 3}, cb),
      (cb) => q.push ({elem:4, pl:'twetrwte'}, {delay: 4}, cb),
      (cb) => setTimeout (cb, 700),

      (cb) => q.next_t ((err, res) => {res.getTime().should.be.approximately(new Date().getTime() + 3300, 100); cb(); }),

      (cb) => q.push ({elem:5, pl:'twetrwte'}, {delay: 2}, cb),
      (cb) => q.push ({elem:6, pl:'twetrwte'}, {delay: 1}, cb),
      (cb) => q.push ({elem:7, pl:'twetrwte'}, {delay: 2}, cb),
      (cb) => setTimeout (cb, 700),

      (cb) => q.next_t ((err, res) => {res.getTime().should.be.approximately(new Date().getTime() + 1300, 100); cb(); }),

      (cb) => q.size ((err, size) => {size.should.equal (0); cb(); }),
      (cb) => q.totalSize ((err, size) => {size.should.equal (7); cb(); }),
      (cb) => q.schedSize ((err, size) => {size.should.equal (7); cb(); }),
      (cb) => q.stats ((err, res) => {res.should.eql ({get: 0, put: 7}); cb(); }),

      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:5, pl:'twetrwte'}); cb (err); })},
      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:6, pl:'twetrwte'}); cb (err); })},
      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:7, pl:'twetrwte'}); cb (err); })},
      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:1, pl:'twetrwte'}); cb (err); })},
      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:2, pl:'twetrwte'}); cb (err); })},
      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:3, pl:'twetrwte'}); cb (err); })},
      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:4, pl:'twetrwte'}); cb (err); })},

      (cb) => q.size ((err, size) => {size.should.equal (0); cb(); }),
      (cb) => q.stats ((err, res) => {res.should.eql ({get: 7, put: 7}); cb(); }),
    ], function(err, results) {
      q.drain();
      done();
    });
  });


  it ('insert & rejections over various buckets go as expected', function (done) {
    var q = factory.queue('test_queue_6');

    async.series([
      (cb) => q.push ({elem:1, pl:'twetrwte'}, cb),
      (cb) => q.push ({elem:2, pl:'twetrwte'}, cb),
      (cb) => setTimeout (cb, 700),

      (cb) => q.size ((err, size) => {size.should.equal (2); cb(); }),
      (cb) => q.stats ((err, res) => {res.should.eql ({get: 0, put: 2}); cb(); }),

      (cb) => q.push ({elem:3, pl:'twetrwte'}, cb),
      (cb) => setTimeout (cb, 700),

      (cb) => q.size ((err, size) => {size.should.equal (3); cb(); }),
      (cb) => q.stats ((err, res) => {res.should.eql ({get: 0, put: 3}); cb(); }),

      (cb) => q.next_t ((err, res) => {res.getTime().should.be.approximately(new Date().getTime() - 1400, 100); cb(); }),

      (cb) => {
        q.pop ('c1', {reserve: true}, (err, ret) => {
          ret.payload.should.eql ({elem:1, pl:'twetrwte'});
          q.ko (ret._id, (new Date().getTime() + 5000 ), (err, res) => {
            should (res).equal (true);
            cb (err);
          });
        });
      },

      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:2, pl:'twetrwte'}); cb (err); })},

      (cb) => {
        q.pop ('c1', {reserve: true}, (err, ret) => {
          ret.payload.should.eql ({elem:3, pl:'twetrwte'});
          q.ko (ret._id, (new Date().getTime() + 3000 ), (err, res) => {
            should (res).equal (true);
            cb (err);
          });
        });
      },

      (cb) => setTimeout (cb, 700),

      (cb) => q.next_t ((err, res) => {res.getTime().should.be.approximately(new Date().getTime() + 2500, 500); cb(); }),

      (cb) => q.size ((err, size) => {size.should.equal (0); cb(); }),
      (cb) => q.totalSize ((err, size) => {size.should.equal (2); cb(); }),
      (cb) => q.schedSize ((err, size) => {size.should.equal (2); cb(); }),

      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:3, pl:'twetrwte'}); cb (err); })},
      (cb) => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:1, pl:'twetrwte'}); cb (err); })},

      (cb) => q.size ((err, size) => {size.should.equal (0); cb(); }),
      (cb) => q.stats ((err, res) => {res.should.eql ({get: 5, put: 3}); cb(); }),
    ], function(err, results) {
      q.drain();
      done();
    });
  });
});

});
