
var async =   require ('async');
var should =  require ('should');

var LocalSignal = require ('../signal/local');
var MemStats =    require ('../stats/mem');

const MongoClient = require ('mongodb').MongoClient;


process.on('unhandledRejection', (err, p) => {
  console.error('unhandledRejection', err.stack, p)
})

let factory = null;

[
  {label: 'MongoDB SafeBucket', mq: require ('../backends/bucket-mongo-safe')}
].forEach (MQ_item => {


  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe ('bucket-at-least-once with ' + MQ_item.label + ' queue backend', () => {
  const MQ = MQ_item.mq;

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  before (done => {
    const opts = {
      url: 'mongodb://localhost/keuss_test_bucket_at_least_once',
      signaller: { provider: LocalSignal},
      stats: {provider: MemStats}
    };

    MQ (opts, (err, fct) => {
      if (err) return done (err);
      factory = fct;
      done();
    });
  });

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  after (done => async.series ([
    cb => setTimeout (cb, 1000),
    cb => factory.close (cb),
    cb => MongoClient.connect ('mongodb://localhost/keuss_test_bucket_at_least_once', (err, cl) => {
      if (err) return done (err);
      cl.db().dropDatabase (() => cl.close (cb))
    })
  ], done));


  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  it ('queue is created empty and ok', done => {
    factory.queue('test_queue_1', (err, q) => {
      if (err) return done (err);
      should.equal (q.nextMatureDate (), null);
      q.name ().should.equal ('test_queue_1');

      async.series([
        cb => q.stats(cb),
        cb => q.size (cb),
        cb => q.totalSize (cb),
        cb => q.next_t (cb),
      ], (err, results) => {
        if (err) return done (err);
        results.should.eql ([{get: 0, put: 0, reserve: 0, commit: 0, rollback: 0, deadletter: 0}, 0, 0, null])
        done();
      });
    });
  });


  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  it ('sequential push & pops, go as expected', done => {
    factory.queue('test_queue_2', (err, q) => {
      if (err) return done (err);

      async.series([
        cb => q.push ({elem:1, pl:'twetrwte'}, cb),
        cb => q.push ({elem:2, pl:'twetrwte'}, cb),
        cb => setTimeout (cb, 1111),
        cb => q.size (function (err, size) {
          size.should.equal (2);
          cb(err);
        }),
        cb => q.stats ((err, res) => {
          res.should.eql ({get: 0, put: 2, reserve: 0, commit: 0, rollback: 0, deadletter: 0});
          cb(err);
        }),
       cb => q.next_t ((err, res) => {
          res.getTime().should.be.approximately(new Date().getTime(), 2000);
          cb(err);
        }),
        cb => q.pop ('c1', (err, ret) => {
          ret.payload.should.eql ({elem:1, pl:'twetrwte'});
          cb (err);
        }),
        cb => q.size ((err, size) => {
          size.should.equal (0);
          cb(err);
        }),
        cb => q.stats ((err, res) => {
          res.should.eql ({get: 1, put: 2, reserve: 0, commit: 0, rollback: 0, deadletter: 0});
          cb(err);
        }),
        cb => q.pop ('c2', (err, ret) => {
          ret.payload.should.eql ({elem:2, pl:'twetrwte'});
          cb (err);
        }),
        cb => q.size ((err, size) => {
          size.should.equal (0);
          cb(err);
        }),
        cb => q.stats ((err, res) => {
          res.should.eql ({get: 2, put: 2, reserve: 0, commit: 0, rollback: 0, deadletter: 0});
          cb(err);
        }),
      ], (err, results) => {
        if (err) return done (err);
        q.drain();
        done();
      });
    });
  });


  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  it ('pop cancellation works as expected', function (done){
    factory.queue('test_queue_3', (err, q) => {
      if (err) return done (err);

      async.series([
        cb => {
          const tid1 = q.pop ('c1', {timeout: 2000}, (err, ret) => {err.should.equal('cancel')});
          q.consumers().length.should.equal (1);
          const tid2 = q.pop ('c2', {timeout: 2000}, (err, ret) => {err.should.equal('cancel')});
          q.nConsumers().should.equal (2);
          q.cancel (tid1);
          q.nConsumers().should.equal (1);
          q.cancel (tid2);
          q.nConsumers().should.equal (0);
          cb();
        },
        cb => {q.push ({elem:2, pl:'cancel-twetrwte'}, cb)},
        cb => {q.push ({elem:1, pl:'cancel-twetrwte'}, cb)},
        cb => {setTimeout (cb, 1111)},
        cb => q.pop ('c3', {timeout: 15000}, (err, ret) => {
          ret.payload.should.eql ({elem:2, pl:'cancel-twetrwte'});
          cb (err, ret);
        }),
        cb => q.pop ('c4', {timeout: 15000}, (err, ret) => {
          ret.payload.should.eql ({elem:1, pl:'cancel-twetrwte'});
          cb (err, ret);
        }),
        cb => q.size ((err, size) => {
          size.should.equal (0);
          cb(err);
        }),
        cb => q.stats ((err, res) => {
          res.should.eql ({get: 2, put: 2, reserve: 0, commit: 0, rollback: 0, deadletter: 0});
          cb(err);
        }),
      ], (err, results) => {
        if (err) return done (err);
        q.drain();
        done();
      });
    });
  });


  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  it ('push & pop on 2 buckets ok', function (done) {
    factory.queue('test_queue_4', (err, q) => {
      if (err) return done (err);

      async.series([
        cb => q.push ({elem:1, pl:'twetrwte'}, cb),
        cb => q.push ({elem:2, pl:'twetrwte'}, cb),
        cb => q.push ({elem:3, pl:'twetrwte'}, cb),
        cb => q.push ({elem:4, pl:'twetrwte'}, cb),
        cb => setTimeout (cb, 666),
        cb => q.size ((err, size) => {size.should.equal (4); cb(err); }),
        cb => q.stats ((err, res) => {res.should.eql ({get: 0, put: 4, reserve: 0, commit: 0, rollback: 0, deadletter: 0}); cb(err); }),
        cb => q.push ({elem:5, pl:'twetrwte'}, cb),
        cb => q.push ({elem:6, pl:'twetrwte'}, cb),
        cb => q.push ({elem:7, pl:'twetrwte'}, cb),
        cb => setTimeout (cb, 666),
        cb => q.size ((err, size) => {size.should.equal (7); cb(err); }),
        cb => q.stats ((err, res) => {res.should.eql ({get: 0, put: 7, reserve: 0, commit: 0, rollback: 0, deadletter: 0}); cb(err); }),
        cb => q.next_t ((err, res) => {res.getTime().should.be.approximately(new Date().getTime(), 2000); cb(err); }),
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:1, pl:'twetrwte'}); cb (err); })},
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:2, pl:'twetrwte'}); cb (err); })},
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:3, pl:'twetrwte'}); cb (err); })},
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:4, pl:'twetrwte'}); cb (err); })},
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:5, pl:'twetrwte'}); cb (err); })},
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:6, pl:'twetrwte'}); cb (err); })},
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:7, pl:'twetrwte'}); cb (err); })},
        cb => q.size ((err, size) => {size.should.equal (0); cb(err); }),
        cb => q.stats ((err, res) => {res.should.eql ({get: 7, put: 7, reserve: 0, commit: 0, rollback: 0, deadletter: 0}); cb(err); }),
      ], (err, results) => {
        if (err) return done (err);
        q.drain();
        done();
      });
    });
  });


  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  it ('push & pop with delay ok', function (done) {
    factory.queue('test_queue_5', (err, q) => {
      if (err) return done (err);

      async.series([
        cb => q.push ({elem:1, pl:'twetrwte'}, {delay: 4}, cb),
        cb => q.push ({elem:2, pl:'twetrwte'}, {delay: 2}, cb),
        cb => q.push ({elem:3, pl:'twetrwte'}, {delay: 3}, cb),
        cb => q.push ({elem:4, pl:'twetrwte'}, {delay: 4}, cb),
        cb => setTimeout (cb, 700),
        cb => q.next_t ((err, res) => {res.getTime().should.be.approximately(new Date().getTime() + 3300, 100); cb(err); }),
        cb => q.push ({elem:5, pl:'twetrwte'}, {delay: 2}, cb),
        cb => q.push ({elem:6, pl:'twetrwte'}, {delay: 1}, cb),
        cb => q.push ({elem:7, pl:'twetrwte'}, {delay: 2}, cb),
        cb => setTimeout (cb, 700),
        cb => q.next_t ((err, res) => {res.getTime().should.be.approximately(new Date().getTime() + 1300, 100); cb(err); }),
        cb => q.size ((err, size) => {size.should.equal (0); cb(err); }),
        cb => q.totalSize ((err, size) => {size.should.equal (7); cb(err); }),
        cb => q.schedSize ((err, size) => {size.should.equal (7); cb(err); }),
        cb => q.stats ((err, res) => {res.should.eql ({get: 0, put: 7, reserve: 0, commit: 0, rollback: 0, deadletter: 0}); cb(err); }),
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:5, pl:'twetrwte'}); cb (err); })},
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:6, pl:'twetrwte'}); cb (err); })},
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:7, pl:'twetrwte'}); cb (err); })},
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:1, pl:'twetrwte'}); cb (err); })},
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:2, pl:'twetrwte'}); cb (err); })},
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:3, pl:'twetrwte'}); cb (err); })},
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:4, pl:'twetrwte'}); cb (err); })},
        cb => q.size ((err, size) => {size.should.equal (0); cb(err); }),
        cb => q.stats ((err, res) => {res.should.eql ({get: 7, put: 7, reserve: 0, commit: 0, rollback: 0, deadletter: 0}); cb(err); }),
      ], (err, results) => {
        if (err) return done (err);
        q.drain();
        done();
      });
    });
  });


  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  it ('insert & rejections over various buckets go as expected', function (done) {
    factory.queue('test_queue_6', (err, q) => {
      if (err) return done (err);

      async.series([
        cb => q.push ({elem:1, pl:'twetrwte'}, cb),
        cb => q.push ({elem:2, pl:'twetrwte'}, cb),
        cb => setTimeout (cb, 700),
        cb => q.size ((err, size) => {size.should.equal (2); cb(err); }),
        cb => q.stats ((err, res) => {res.should.eql ({get: 0, put: 2, reserve: 0, commit: 0, rollback: 0, deadletter: 0}); cb(err); }),
        cb => q.push ({elem:3, pl:'twetrwte'}, cb),
        cb => setTimeout (cb, 700),
        cb => q.size ((err, size) => {size.should.equal (3); cb(err); }),
        cb => q.stats ((err, res) => {res.should.eql ({get: 0, put: 3, reserve: 0, commit: 0, rollback: 0, deadletter: 0}); cb(err); }),
        cb => q.next_t ((err, res) => {res.getTime().should.be.approximately(new Date().getTime() - 1400, 100); cb(err); }),
        cb => {
          q.pop ('c1', {reserve: true}, (err, ret) => {
            if (err) return cb (err);
            ret.payload.should.eql ({elem:1, pl:'twetrwte'});
            q.ko (ret._id, (new Date().getTime() + 5000 ), (err, res) => {
              should (res).equal (true);
              cb (err);
            });
          });
        },
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:2, pl:'twetrwte'}); cb (err); })},
        cb => {
          q.pop ('c1', {reserve: true}, (err, ret) => {
            if (err) return cb (err);
            ret.payload.should.eql ({elem:3, pl:'twetrwte'});
            q.ko (ret._id, (new Date().getTime() + 3000 ), (err, res) => {
              should (res).equal (true);
              cb (err);
            });
          });
        },
        cb => setTimeout (cb, 700),
        cb => q.next_t ((err, res) => {res.getTime().should.be.approximately(new Date().getTime() + 2500, 500); cb(err); }),
        cb => q.size ((err, size) => {size.should.equal (0); cb(err); }),
        cb => q.totalSize ((err, size) => {size.should.equal (2); cb(err); }),
        cb => q.schedSize ((err, size) => {size.should.equal (2); cb(err); }),
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:3, pl:'twetrwte'}); cb (err); })},
        cb => {q.pop ('c1', (err, ret) => {ret.payload.should.eql ({elem:1, pl:'twetrwte'}); cb (err); })},
        cb => q.size ((err, size) => {size.should.equal (0); cb(err); }),
        cb => q.stats ((err, res) => {res.should.eql ({get: 3, put: 3, reserve: 2, commit: 0, rollback: 2, deadletter: 0}); cb(err); }),
      ], (err, results) => {
        if (err) return done (err);
        q.drain();
        done();
      });
    });
  });
});

});
