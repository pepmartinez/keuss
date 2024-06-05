const async =  require ('async');
const should = require ('should');
const _ =      require ('lodash');

const LocalSignal = require ('../signal/local');
const MemStats =    require ('../stats/mem');

const MongoClient = require ('mongodb').MongoClient;

let factory = null;

process.on("unhandledRejection", reason => {
	console.log("unhandled rejection:", reason);
	throw reason;
});

function _q_size_should_be (q, val, cb) {
  q.size((err, size) => {
    if (err) return cb(err);
    size.should.equal(val);
    cb();
  });
}

function _q_totalsize_should_be (q, val, cb) {
  q.totalSize((err, size) => {
    if (err) return cb(err);
    size.should.equal(val);
    cb();
  });
}

function _q_stats_should_be (q, val, cb) {
  q.stats((err, stats) => {
    if (err) return cb(err);
    stats.should.match(val);
    cb();
  });
}


[
  {label: 'Simple MongoDB',       mq: require ('../backends/mongo'),        unknown_id: '112233445566778899001122'},
  {label: 'Pipelined MongoDB',    mq: require ('../backends/pl-mongo'),     unknown_id: '112233445566778899001122'},
  {label: 'Tape MongoDB',         mq: require ('../backends/ps-mongo'),     unknown_id: '112233445566778899001122'},
  {label: 'Stream MongoDB',       mq: require ('../backends/stream-mongo'), unknown_id: '112233445566778899001122'},
 // {label: 'Safe MongoDB Buckets', mq: require ('../backends/bucket-mongo-safe'), unknown_id: '112233445566778899001122'},
  {label: 'Redis OrderedQueue',   mq: require ('../backends/redis-oq'),     unknown_id: '112233445566778899001122'},
  {label: 'Mongo IntraOrder',     mq: require ('../backends/intraorder'),   unknown_id: '112233445566778899001122'},
  {label: 'Postgres',             mq: require ('../backends/postgres'),     unknown_id: '00000000-0000-0000-0000-000000000000'},
].forEach(MQ_item => {
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe('reserve-commit-rollback with ' + MQ_item.label + ' queue backend', () => {
    const MQ = MQ_item.mq;

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    before(done => {
      const opts = {
        url: 'mongodb://localhost/keuss_test_backends_rcr',
        signaller: { provider: LocalSignal},
        stats: {provider: MemStats}
      };

      MQ(opts, (err, fct) => {
        if (err) return done(err);
        factory = fct;
        done();
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    after (done => async.series ([
      cb => setTimeout (cb, 1000),
      cb => factory.close (cb),
      cb => MongoClient.connect ('mongodb://localhost/keuss_test_backends_rcr', (err, cl) => {
        if (err) return done (err);
        cl.db().dropDatabase (() => cl.close (cb))
      })
    ], done));


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('queue is created empty and ok', done => {
      const q = factory.queue('test_queue_1');
      should.equal(q.nextMatureDate(), null);

      async.series([
        cb => q.init(cb),
        cb => q.stats(cb),
        cb => q.size(cb),
        cb => q.totalSize(cb),
        cb => q.schedSize(cb),
        cb => q.next_t(cb),
      ], (err, results) => {
        if (err) return done (err);
        results.should.eql([undefined, {
          get: 0,
          put: 0,
          reserve: 0,
          commit: 0,
          rollback: 0, 
          deadletter: 0
        }, 0, 0, 0, null]);
        done();
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('sequential push & pops with no delay, go as expected', done => {
      const q = factory.queue('test_queue_2');

      async.series([
        cb => q.init(cb),
        cb => q.push({elem: 1, pl: 'twetrwte'}, cb),
        cb => q.push({elem: 2, pl: 'twetrwte'}, cb),
        cb => _q_size_should_be (q, 2, cb),
        cb => _q_stats_should_be (q, {
          get: 0,
          put: 2,
          reserve: 0,
          commit: 0,
          rollback: 0, 
          deadletter: 0
        }, cb),
        cb=> q.next_t((err, res) => {
          res.getTime().should.be.approximately(new Date().getTime(), 500);
          cb();
        }),
        cb => q.pop('c1', cb),
        cb => _q_size_should_be (q, 1, cb),
        cb => _q_stats_should_be (q, {
          get: 1,
          put: 2,
          reserve: 0,
          commit: 0,
          rollback: 0,
          deadletter: 0
        }, cb),
        cb => q.pop('c2', cb), 
        cb => _q_size_should_be (q, 0, cb),
        cb => setTimeout (cb, 1000),
        cb => _q_stats_should_be (q, {
          get: 2,
          put: 2,
          reserve: 0,
          commit: 0,
          rollback: 0,
          deadletter: 0
        }, cb),
        cb => q.next_t((err, res) => {
          if (q.type () !=  'mongo:intraorder') {
            should.equal(res, null);
          }
          cb();
        })
      ], done);
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('sequential push & pops with delays, go as expected', done => {
      const q = factory.queue('test_queue_3');

      async.series([
        cb => q.init(cb),
        cb => q.push({elem: 1, pl: 'twetrwte'}, {delay: 2}, cb),
        cb => setTimeout(cb, 150),
        cb => q.push({elem: 2, pl: 'twetrwte'}, {delay: 1}, cb),
        cb => _q_size_should_be (q, 0, cb),
        cb => _q_stats_should_be (q, {
          get: 0,
          put: 2,
          reserve: 0,
          commit: 0,
          rollback: 0,
          deadletter: 0
        }, cb),
        cb => q.next_t((err, res) => {
          res.getTime().should.be.approximately(new Date().getTime() + 1000, 100);
          cb();
        }),
        cb => q.pop('c1', (err, ret) => {
          ret.payload.should.eql({elem: 2, pl: 'twetrwte'});
          cb(err, ret);
        }),
        cb => _q_size_should_be (q, 0, cb),
        cb => _q_stats_should_be (q, {
          get: 1,
          put: 2,
          reserve: 0,
          commit: 0,
          rollback: 0,
          deadletter: 0
        }, cb),
        cb => q.next_t((err, res) => {
          res.getTime().should.be.approximately(new Date().getTime() + 1000, 500);
          cb();
        }),
        cb => q.pop('c2', (err, ret) => {
          ret.payload.should.eql({elem: 1, pl: 'twetrwte'});
          cb(err, ret);
        }),
        cb => _q_size_should_be (q, 0, cb),
        cb => _q_stats_should_be (q, {
          get: 2,
          put: 2,
          reserve: 0,
          commit: 0,
          rollback: 0,
          deadletter: 0
        }, cb),
        cb => q.next_t((err, res) => {
          if (q.type () !=  'mongo:intraorder') {
            should.equal(res, null);
          }
          cb();
        }),
      ], done);
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('timed-out pops work as expected', done => {
      const q = factory.queue('test_queue_4');

      async.series([
        cb => q.init(cb),
        cb => q.push({elem: 1, pl: 'twetrwte'}, {delay: 6}, cb),
        cb => setTimeout(cb, 150),
        cb => q.push({elem: 2, pl: 'twetrwte'}, {delay: 5}, cb),
        cb => _q_size_should_be (q, 0, cb),
        cb => _q_stats_should_be (q, {
              get: 0,
              put: 2,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
        }, cb),
        cb => q.pop('c1', {timeout: 2000}, (err, ret) => {
          should.equal(ret, null);
          cb();
        }),
        cb => _q_size_should_be (q, 0, cb),
        cb => _q_stats_should_be (q, {
              get: 0,
              put: 2,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
        }, cb),
        cb => q.pop('c2', {timeout: 2000}, (err, ret) => {
          should.equal(ret, null);
          cb();
        }),
        cb => _q_size_should_be (q, 0, cb),
        cb => _q_stats_should_be (q, {
              get: 0,
              put: 2,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
        }, cb),
        cb => q.pop('c3', {timeout: 5000}, (err, ret) => {
          ret.payload.should.eql({elem: 2, pl: 'twetrwte'});
          cb(err, ret);
        }),
        cb => q.pop('c4', {timeout: 5000}, (err, ret) => {
          ret.payload.should.eql({elem: 1, pl: 'twetrwte'});
          cb(err, ret);
        }),
        cb => _q_size_should_be (q, 0, cb),
        cb => _q_stats_should_be (q, {
              get: 2,
              put: 2,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
        }, cb),
      ], done);
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('pop cancellation works as expected', done => {
      var q = factory.queue('test_queue_5');

      async.series([
        cb => q.init(cb),
        cb => q.push({elem: 1, pl: 'twetrwte'}, {delay: 6}, cb),
        cb => q.push({elem: 2, pl: 'twetrwte'}, {delay: 5}, cb),
        cb => {
          q.consumers().length.should.equal(0);
          cb();
        },
        cb => {
          const tid1 = q.pop('c1', {timeout: 2000}, err => err.should.equal('cancel'));
          q.consumers().length.should.equal(1);
          const tid2 = q.pop('c2', {timeout: 2000}, err => err.should.equal('cancel'));
          q.nConsumers().should.equal(2);
          q.cancel(tid1);
          q.nConsumers().should.equal(1);
          q.cancel(tid2);
          q.nConsumers().should.equal(0);
          cb();
        },
        cb => q.pop('c3', {timeout: 15000}, (err, ret) => {
          ret.payload.should.eql({elem: 2, pl: 'twetrwte'});
          cb(err, ret);
        }),
        cb => q.pop('c4', {timeout: 15000}, (err, ret) => {
          ret.payload.should.eql({elem: 1, pl: 'twetrwte'});
          cb(err, ret);
        }),
        cb => _q_size_should_be (q, 0, cb),
        cb => _q_stats_should_be (q, {
              get: 2,
              put: 2,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
        }, cb),      
      ], done);
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('simultaneous timed out pops on delayed items go in the expected order', done => {
      const q = factory.queue('test_queue_6');
      const hrTime = process.hrtime();

      async.series([
        cb => q.init(cb),
        cb => q.push({elem: 1, pl: 'twetrwte'}, {delay: 6}, cb),
        cb => q.push({elem: 2, pl: 'twetrwte'}, {delay: 5}, cb),
        cb => setTimeout(cb, 150),
        cb => q.push({elem: 3, pl: 'twetrwte'}, {delay: 4}, cb),
        cb => {
          q.consumers().length.should.equal(0);
          cb();
        },
        cb => _q_stats_should_be (q, {
              get: 0,
              put: 3,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
        }, cb),   
        cb => async.parallel([
            cb => q.pop('c1', {timeout: 12000}, cb),
            cb => {
              const tid = q.pop('c0', {timeout: 12000}, err => err.should.equal('cancel'));
              setTimeout(() => {q.cancel(tid); cb();}, 3000);
            },
            cb => q.pop('c2', {timeout: 12000}, cb),
            cb => q.pop('c3', {timeout: 12000}, cb),
          ], cb),
        cb => {
          const diff = process.hrtime(hrTime);
          const delta = (diff[0] * 1000 + diff[1] / 1000000);
          delta.should.be.approximately(6000, 500);
          cb();
        },
        cb => _q_size_should_be (q, 0, cb),
        cb => _q_stats_should_be (q, {
              get: 3,
              put: 3,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
        }, cb),      
      ], done);
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should do raw reserve & commit as expected', done => {
      const q = factory.queue('test_queue_7');
      let id = null;
      let obj = null;

      async.series([
        cb => q.init(cb),
        cb => q.push({elem: 1, pl: 'twetrwte'}, cb),
        cb => _q_size_should_be (q, 1, cb),
        cb => q.next_t((err, res) => {
          res.getTime().should.be.approximately(new Date().getTime(), 500);
          cb();
        }),
        cb => q.reserve((err, res) => {
          id = res._id;
          obj = res;
          res.payload.should.eql({
            elem: 1,
            pl: 'twetrwte'
          });
          res.tries.should.equal(0);
          cb();
        }),
        cb => _q_size_should_be (q, 0, cb),
        cb => _q_totalsize_should_be (q, 1, cb),
        cb => q.next_t((err, res) => {
          res.getTime().should.be.approximately(new Date().getTime() + 120000, 500);
          cb();
        }),
        cb => q.commit(id, (err, res) => {
          res.should.equal(true);
          cb();
        }, obj),
        cb => _q_size_should_be (q, 0, cb),
        cb => _q_totalsize_should_be (q, 0, cb),
        cb => q.next_t((err, res) => {
          if (q.type () !=  'mongo:intraorder') {
            should.equal(res, null);
          }
          cb();
        }),
      ], done);
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should do raw reserve & rollback as expected', done => {
      const q = factory.queue('test_queue_8');
      let id = null;
      let obj = null;

      async.series([
        cb => q.init(cb),
        cb => q.push({elem: 1, pl: 'twetrwte'}, cb),
        cb => _q_size_should_be (q, 1, cb),
        cb => q.next_t((err, res) => {
          res.getTime().should.be.approximately(new Date().getTime(), 500);
          cb();
        }),
        cb => q.reserve((err, res) => {
          id = res._id;
          obj = res;
          res.payload.should.eql({elem: 1, pl: 'twetrwte'});
          res.tries.should.equal(0);
          cb();
        }),
        cb => _q_size_should_be (q, 0, cb),
        cb => _q_totalsize_should_be (q, 1, cb),
        cb => q.next_t((err, res) => {
          res.getTime().should.be.approximately(new Date().getTime() + 120000, 500);
          cb();
        }),
        cb => q.rollback(id, (err, res) => {
          res.should.equal(true);
          cb();
        }),
        cb => _q_size_should_be (q, 1, cb),
        cb => _q_totalsize_should_be (q, 1, cb),
        cb => q.next_t((err, res) => {
          res.getTime().should.be.approximately(new Date().getTime(), 500);
          cb();
        }),
        cb => q.commit(id, (err, res) => {
          res.should.equal(false);
          cb();
        }, obj),
        cb => _q_size_should_be (q, 1, cb),
        cb => _q_totalsize_should_be (q, 1, cb),
        cb => q.next_t((err, res) => {
          res.getTime().should.be.approximately(new Date().getTime(), 500);
          cb();
        }),
        cb => q.get((err, res) => {
          res._id.should.eql(id);
          res.payload.should.eql({elem: 1, pl: 'twetrwte'});
          res.tries.should.equal(1);
          cb();
        }),
        cb => _q_size_should_be (q, 0, cb),
        cb => _q_totalsize_should_be (q, 0, cb),
        cb => q.next_t((err, res) => {
          if (q.type () !=  'mongo:intraorder') {
            should.equal(res, null);
          }
          cb();
        }),
      ], done);
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should do get.reserve & ok as expected', done => {
      const  q = factory.queue('test_queue_9');
      let id = null;
      let obj = null;

      async.series([
        cb => q.init(cb),
        cb => q.push({elem: 1, pl: 'twetrwte'}, cb),
        cb => q.pop('c1', {reserve: true}, (err, res) => {
          id = res._id;
          obj = res;
          res.payload.should.eql({elem: 1, pl: 'twetrwte'});
          res.tries.should.equal(0);
          cb();
        }),
        cb => _q_size_should_be (q, 0, cb),
        cb => _q_totalsize_should_be (q, 1, cb),
        cb => q.next_t((err, res) => {
          res.getTime().should.be.approximately(new Date().getTime() + 120000, 500);
          cb();
        }),
        cb => q.ok(obj, (err, res) => {
          res.should.equal(true);
          cb();
        }),
        cb => _q_size_should_be (q, 0, cb),
        cb => _q_totalsize_should_be (q, 0, cb),
        cb => q.next_t((err, res) => {
          if (q.type () !=  'mongo:intraorder') {
            should.equal(res, null);
          }
          cb();
        }),
        cb => setTimeout (cb, 1000),
        cb => _q_stats_should_be (q, {
            get: 0,
            put: 1,
            reserve: 1,
            commit: 1,
            rollback: 0,
            deadletter: 0
        }, cb),
      ], done);
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should manage rollback on invalid id as expected', done => {
      const q = factory.queue('test_queue_10');

      if (q.type () ==  'redis:oq') return done ();
      if (q.type () ==  'mongo:intraorder') return done ();

      async.series([
        cb => q.init(cb),
        cb => q.rollback('invalid-id', (err, res) => {
          err.should.not.be.null
          should(res).equal(undefined);
          cb();
        })
      ], done);
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should show coherent values of size, schedSize, resvSize on push, pop, reserve, commit, rollback', done => {
      function _get_all_sizes (q, cb) {
        async.parallel ([
          cb => q.totalSize (cb),
          cb => q.size (cb),
          cb => q.schedSize (cb),
          cb => q.resvSize (cb)
        ], cb);
      };

      if (MQ_item.label == 'Redis OrderedQueue') return done ();

      const q = factory.queue('test_queue_11');
      const state = {};

      async.series([
        cb => q.init(cb),
        cb => _get_all_sizes (q, cb),
        cb => q.push ({a:1, b:2}, {delay: 2}, cb),
        cb => q.push ({a:2, b:2}, cb),
        cb => q.push ({a:3, b:2}, cb),
        cb => _get_all_sizes (q, cb),
        cb => q.pop ('me', {reserve: true}, (err, res) => {
          if (err) return db (err);
          state.reserved_id = res._id;
          cb (null, res._id);
        }),
        cb => _get_all_sizes (q, cb),
        cb => q.ko (state.reserved_id, cb),
        cb => _get_all_sizes (q, cb),
        cb => q.pop ('me', {reserve: true}, (err, res) => {
          if (err) return db (err);
          state.reserved_id = res._id;
          state.reserved_obj = res;
          cb (null, res._id);
        }),
        cb => _get_all_sizes (q, cb),
        cb => q.ok (state.reserved_id, cb, state.reserved_obj),
        cb => _get_all_sizes (q, cb),
        cb => q.pop ('me', cb),
        cb => q.pop ('me', cb),
        cb => _get_all_sizes (q, cb),
      ], (err, res) => {
        if (err) return done (err);
        var figs = res.filter (i => _.isArray (i));
        figs.should.eql ([
          [ 0, 0, 0, 0 ],
          [ 3, 2, 1, 0 ],
          [ 3, 1, 1, 1 ], // [ 3, 1, 2, 1 ],
          [ 3, 2, 1, 0 ],
          [ 3, 1, 1, 1 ], // [ 3, 1, 2, 1 ],
          [ 2, 1, 1, 0 ],
          [ 0, 0, 0, 0 ] ]);

        done ();
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should manage rollback on unknown id as expected', done => {
      const q = factory.queue('test_queue_12');

      async.series([
        cb => q.init(cb),
        cb => q.rollback(MQ_item.unknown_id, (err, res) => {
          should(err).equal(null)
          should(res).equal(false);
          cb();
        })
      ], done);
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should rollback ok using full object', done => {
      const q = factory.queue('test_queue_13');
      const state = {};

      async.series([
        cb => q.init(cb),
        cb => q.push ({a:1, b:2}, {delay: 2}, cb),
        cb => q.pop ('me', {reserve: true}, (err, res) => {
          if (err) return db (err);
          state.reserved_obj = res;
          res.payload.should.eql ({a:1, b:2});
          res.tries.should.equal (0);
          cb (null, res);
        }),
        cb => q.ko (state.reserved_obj, cb),
        cb => q.pop ('me', {reserve: true}, (err, res) => {
          if (err) return db (err);
          state.reserved_obj = res;
          res.payload.should.eql ({a:1, b:2});
          res.tries.should.equal (1);
          cb (null, res);
        }),
        cb => q.ko (state.reserved_obj, cb),
        cb => q.pop ('me', {reserve: true}, (err, res) => {
          if (err) return db (err);
          state.reserved_obj = res;
          res.payload.should.eql ({a:1, b:2});
          res.tries.should.equal (2);
          cb (null, res);
        }),
        cb => q.ok (state.reserved_obj, cb),
        cb => setTimeout (cb, 1000),
        cb => q.stats((err, res) => {
          res.should.match({
            get: 0,
            put: 1,
            reserve: 3,
            commit: 1,
            rollback: 2,
            deadletter: 0
          });
          cb();
        }),
      ], done);
    });

  });
});
