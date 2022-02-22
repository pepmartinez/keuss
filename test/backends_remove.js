var async =  require ('async');
var should = require ('should');
var _ =      require ('lodash');

var LocalSignal = require ('../signal/local');
var MemStats =    require ('../stats/mem');

const MongoClient = require ('mongodb').MongoClient;
const Redis =       require("ioredis");

function stats (q, cb) {
  async.series ({
    stats: cb => q.stats(cb),
    tsize: cb => q.totalSize(cb),
    rsize: cb => q.resvSize(cb),
  }, (err, res) => {
//    console.log ('stats:', res);
    cb (err, res);
  });
}


function get_mq_factory (MQ, opts, cb) {
  const common_opts = {
    url: 'mongodb://localhost/keuss_test_backends_remove',
    signaller: { provider: LocalSignal},
    stats: {provider: MemStats},
    deadletter: {
    }
  };

  // initialize factory
  MQ (_.merge ({}, common_opts, opts), cb);
}

function release_mq_factory (q, factory, cb) {
//  console.log ('releasing mq factory');

  setTimeout (() => {
    q.cancel ();
    factory.close (cb);
  }, 1000);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
[
  {label: 'Simple MongoDB',     mq: require ('../backends/mongo')},
  {label: 'Pipelined MongoDB',  mq: require ('../backends/pl-mongo')},
  {label: 'Tape MongoDB',       mq: require ('../backends/ps-mongo')},
  {label: 'Redis OrderedQueue', mq: require ('../backends/redis-oq')},
  {label: 'MongoDB SafeBucket', mq: require ('../backends/bucket-mongo-safe')}
].forEach(function (MQ_item) {
  var is_redis = (MQ_item.label == 'Redis OrderedQueue');

  describe('remove operations on ' + MQ_item.label + ' queue backend', () => {
    const MQ = MQ_item.mq;

    beforeEach (done => {
      done();
    });

    afterEach (done => async.series ([
      cb => setTimeout (cb, 1000),
      cb => MongoClient.connect ('mongodb://localhost/keuss_test_backends_remove', (err, cl) => {
        if (err) return done (err);
        cl.db().dropDatabase (() => cl.close (cb))
      }),
      cb => {
        const redis = new Redis();
        redis.keys ('*', (err, keys) => {
          const tasks = [];
          _.each (keys, k => tasks.push (cb => redis.del (k, cb))); 
          async.series (tasks, (err, res) => {
            redis.disconnect();
            cb (err, res);
          });
        });
      }
    ], done));


    it('fails on invalid id', done => {
      // skip if redis
      if (is_redis) return done();

      async.waterfall ([
        cb => get_mq_factory (MQ, {}, cb),
        (factory, cb) => {
          const q = factory.queue('test_queue_remove', {});
          q.remove ('invalid-id', err => cb (null, err, q, factory))
        },
        (err, q, factory, cb) => {
          err.should.match (/id \[invalid-id\] can not be used as remove id/);
          release_mq_factory (q, factory, cb);
        }
      ], done);
    });


    it('fails on nonexistent id', done => {
      async.waterfall ([
        cb => get_mq_factory (MQ, {}, cb),
        (factory, cb) => {
          const q = factory.queue('test_queue_remove', {});
          q.remove ('00112233445566778899aabb', (err, res) => cb (null, err, res, q, factory))
        },
        (err, res, q, factory, cb) => {
          should (err).be.null();
          res.should.be.false();
          release_mq_factory (q, factory, cb);
        }
      ], done);
    });


    it('deletes regular element ok', done => {
      const ctx = {};
      async.waterfall ([
        cb => get_mq_factory (MQ, {}, cb),
        (factory, cb) => {
          const q = factory.queue('test_queue_remove', {});
          cb (null, q, factory);
        },
        (q, factory, cb) => async.series ([
          cb => q.push ({a: 1, b: 'oo'}, cb),
          cb => setTimeout (cb, 1000),
          cb => stats (q, cb)
        ], (err, res) => {
          ctx.id = res[0];
          ctx.id.should.not.be.null();
          res[2].should.eql ({
            stats: { get: 0, put: 1, reserve: 0, commit: 0, rollback: 0, deadletter: 0 },
            tsize: 1,
            rsize: is_redis ? null : 0
          })
          cb (err, q, factory);
        }),
        (q, factory, cb) => {
          q.remove (ctx.id, (err, res) => {
            should (err).be.null();
            res.should.be.true();
            cb (err, q, factory);
          });
        },
        (q, factory, cb) => async.series ([
          cb => stats (q, cb),
          cb => setTimeout (cb, 1000),
        ], (err, res) => {
          res[0].should.eql ({
            stats: { get: 0, put: 1, reserve: 0, commit: 0, rollback: 0, deadletter: 0 },
            tsize: 0,
            rsize: is_redis ? null : 0
          });
          cb (err, q, factory);
        }),
        (q, factory, cb) => {
          release_mq_factory (q, factory, cb);
        }
      ], done);
    });


    it('does not delete reserved element', done => {
      const ctx = {};
      async.waterfall ([
        cb => get_mq_factory (MQ, {}, cb),
        (factory, cb) => {
          const q = factory.queue('test_queue_remove', {});
          cb (null, q, factory);
        },
        (q, factory, cb) => async.series ([
          cb => q.push ({a: 1, b: 'oo'}, cb),
          cb => setTimeout (cb, 1000),
        ], (err, res) => {
          ctx.id = res[0];
          ctx.id.should.not.be.null();
          cb (err, q, factory);
        }),
        (q, factory, cb) => { 
          q.pop('c1', { reserve: true }, (err, res) => {
//            res._id.should.eql (ctx.id);
            cb (err, q, factory);
          });
        },
        (q, factory, cb) => {
          q.remove (ctx.id, (err, res) => {
            should (err).be.null();
            res.should.be.false();
            cb (err, q, factory);
          });
        },
        (q, factory, cb) => async.series ([
          cb => stats (q, cb),
          cb => setTimeout (cb, 1000),
        ], (err, res) => {
          res[0].should.eql ({
            stats: { get: 0, put: 1, reserve: 1, commit: 0, rollback: 0, deadletter: 0 },
            tsize: 1,
            rsize: is_redis ? null : 1
          });
          cb (err, q, factory);
        }),
        (q, factory, cb) => {
          release_mq_factory (q, factory, cb);
        }
      ], done);
    });


    it('does delete reserved+rolledback element', done => {
      const ctx = {};
      async.waterfall ([
        cb => get_mq_factory (MQ, {}, cb),
        (factory, cb) => {
          const q = factory.queue('test_queue_remove', {});
          cb (null, q, factory);
        },
        (q, factory, cb) => async.series ([
          cb => q.push ({a: 1, b: 'oo'}, cb),
          cb => setTimeout (cb, 1000),
        ], (err, res) => {
          ctx.id = res[0];
          ctx.id.should.not.be.null();
          cb (err, q, factory);
        }),
        (q, factory, cb) => { 
          q.pop('c1', { reserve: true }, (err, res) => {
            res._id.should.eql (ctx.id);
            cb (err, q, factory);
          });
        },
        (q, factory, cb) =>  async.series ([ 
          cb => q.ko(ctx.id, new Date().getTime() + 2000, cb),
          cb => setTimeout (cb, 1000),
        ], (err, res) => {
          res[0].should.be.true();
          cb (err, q, factory);
        }),
        (q, factory, cb) => {
          q.remove (ctx.id, (err, res) => {
            should (err).be.null();
            res.should.be.true();
            cb (err, q, factory);
          });
        },
        (q, factory, cb) => async.series ([
          cb => stats (q, cb),
          cb => setTimeout (cb, 1000),
        ], (err, res) => {
          res[0].should.eql ({
            stats: { get: 0, put: 1, reserve: 1, commit: 0, rollback: 1, deadletter: 0 },
            tsize: 0,
            rsize: is_redis ? null : 0
          });
          cb (err, q, factory);
        }),
        (q, factory, cb) => {
          release_mq_factory (q, factory, cb);
        }
      ], done);
    });


    it('does fail trying to delete an already-deleted element', done => {
      const ctx = {};
      async.waterfall ([
        cb => get_mq_factory (MQ, {}, cb),
        (factory, cb) => {
          const q = factory.queue('test_queue_remove', {});
          cb (null, q, factory);
        },
        (q, factory, cb) => async.series ([
          cb => q.push ({a: 1, b: 'oo'}, cb),
          cb => setTimeout (cb, 1000),
          cb => stats (q, cb)
        ], (err, res) => {
          ctx.id = res[0];
          ctx.id.should.not.be.null();
          res[2].should.eql ({
            stats: { get: 0, put: 1, reserve: 0, commit: 0, rollback: 0, deadletter: 0 },
            tsize: 1,
            rsize: is_redis ? null : 0
          })
          cb (err, q, factory);
        }),
        (q, factory, cb) => {
          q.remove (ctx.id, (err, res) => {
            should (err).be.null();
            res.should.be.true();
            cb (err, q, factory);
          });
        },
        (q, factory, cb) => {
          q.remove (ctx.id, (err, res) => {
            should (err).be.null();
            res.should.be.false();
            cb (err, q, factory);
          });
        },
        (q, factory, cb) => async.series ([
          cb => stats (q, cb),
          cb => setTimeout (cb, 1000),
        ], (err, res) => {
          res[0].should.eql ({
            stats: { get: 0, put: 1, reserve: 0, commit: 0, rollback: 0, deadletter: 0 },
            tsize: 0,
            rsize: is_redis ? null : 0
          });
          cb (err, q, factory);
        }),
        (q, factory, cb) => {
          release_mq_factory (q, factory, cb);
        }
      ], done);
    });


  });
});
