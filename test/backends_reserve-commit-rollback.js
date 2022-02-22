var async =  require ('async');
var should = require ('should');
var _ =      require ('lodash');

var LocalSignal = require ('../signal/local');
var MemStats =    require ('../stats/mem');

var MongoClient = require ('mongodb').MongoClient;

var factory = null;

[
  {label: 'Simple MongoDB',       mq: require ('../backends/mongo')},
  {label: 'Pipelined MongoDB',    mq: require ('../backends/pl-mongo')},
  {label: 'Tape MongoDB',         mq: require ('../backends/ps-mongo')},
 // {label: 'Safe MongoDB Buckets', mq: require ('../backends/bucket-mongo-safe')},
  {label: 'Redis OrderedQueue',   mq: require ('../backends/redis-oq')}
].forEach(function (MQ_item) {
  describe('reserve-commit-rollback with ' + MQ_item.label + ' queue backend', function () {
    var MQ = MQ_item.mq;

    before(function (done) {
      var opts = {
        url: 'mongodb://localhost/keuss_test_backends_rcr',
        signaller: { provider: LocalSignal},
        stats: {provider: MemStats}
      };

      MQ(opts, function (err, fct) {
        if (err) return done(err);
        factory = fct;
        done();
      });
    });

    after (done => async.series ([
      cb => setTimeout (cb, 1000),
      cb => factory.close (cb),
      cb => MongoClient.connect ('mongodb://localhost/keuss_test_backends_rcr', (err, cl) => {
        if (err) return done (err);
        cl.db().dropDatabase (() => cl.close (cb))
      })
    ], done));

    it('queue is created empty and ok', done => {
      var q = factory.queue('test_queue_1');
      should.equal(q.nextMatureDate(), null);

      async.series([
        cb => q.stats(cb),
        cb => q.size(cb),
        cb => q.totalSize(cb),
        cb => q.schedSize(cb),
        cb => q.next_t(cb),
      ], (err, results) => {
        if (err) return done (err);
        results.should.eql([{
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

    it('sequential push & pops with no delay, go as expected', function (done) {
      var q = factory.queue('test_queue_2');

      async.series([
        cb => q.push({elem: 1, pl: 'twetrwte'}, cb),
        cb => q.push({elem: 2, pl: 'twetrwte'}, cb),
        cb => {
          q.size ((err, size) => {
            size.should.equal(2);
            cb();
          })
        },
        cb => q.stats((err, res) => {
          res.should.eql({
            get: 0,
            put: 2,
            reserve: 0,
            commit: 0,
            rollback: 0, 
            deadletter: 0
          });
          cb();
        }),
        cb=> q.next_t((err, res) => {
          res.getTime().should.be.approximately(new Date().getTime(), 500);
          cb();
        }),
        cb => q.pop('c1', cb),
        cb => q.size((err, size) => {
          size.should.equal(1);
          cb();
        }),
        cb => q.stats((err, res) => {
          res.should.eql({
            get: 1,
            put: 2,
            reserve: 0,
            commit: 0,
            rollback: 0,
            deadletter: 0
          });
          cb();
        }),
        cb => q.pop('c2', cb),
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        cb => setTimeout (cb, 1000),
        cb => q.stats((err, res) => {
          res.should.eql({
            get: 2,
            put: 2,
            reserve: 0,
            commit: 0,
            rollback: 0,
            deadletter: 0
          });
          cb();
        }),
        cb => q.next_t((err, res) => {
          should.equal(res, null);
          cb();
        })
      ], (err, results) => {
        done();
      });
    });

    it('sequential push & pops with delays, go as expected', function (done) {
      var q = factory.queue('test_queue_3');

      async.series([
        function (cb) {
          q.push({
            elem: 1,
            pl: 'twetrwte'
          }, {
            delay: 2
          }, cb)
        },
        function (cb) {
          setTimeout(function () {
            cb()
          }, 150)
        },
        function (cb) {
          q.push({
            elem: 2,
            pl: 'twetrwte'
          }, {
            delay: 1
          }, cb)
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.stats(function (err, res) {
            res.should.eql({
              get: 0,
              put: 2,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
            });
            cb();
          })
        },
        function (cb) {
          q.next_t(function (err, res) {
            res.getTime().should.be.approximately(new Date().getTime() + 1000, 100);
            cb();
          })
        },
        function (cb) {
          q.pop('c1', function (err, ret) {
            ret.payload.should.eql({
              elem: 2,
              pl: 'twetrwte'
            });
            cb(err, ret);
          })
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.stats(function (err, res) {
            res.should.eql({
              get: 1,
              put: 2,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
            });
            cb();
          });
        },
        function (cb) {
          q.next_t(function (err, res) {
            res.getTime().should.be.approximately(new Date().getTime() + 1000, 500);
            cb();
          })
        },
        function (cb) {
          q.pop('c2', function (err, ret) {
            ret.payload.should.eql({
              elem: 1,
              pl: 'twetrwte'
            });
            cb(err, ret);
          })
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.stats(function (err, res) {
            res.should.eql({
              get: 2,
              put: 2,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
            });
            cb();
          })
        },
        function (cb) {
          q.next_t(function (err, res) {
            should.equal(res, null);
            cb();
          });
        }
      ], function (err, results) {
        done();
      });
    });

    it('timed-out pops work as expected', function (done) {
      var q = factory.queue('test_queue_4');

      async.series([
        function (cb) {
          q.push({
            elem: 1,
            pl: 'twetrwte'
          }, {
            delay: 6
          }, cb)
        },
        function (cb) {
          setTimeout(function () {
            cb()
          }, 150)
        },
        function (cb) {
          q.push({
            elem: 2,
            pl: 'twetrwte'
          }, {
            delay: 5
          }, cb)
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.stats(function (err, res) {
            res.should.eql({
              get: 0,
              put: 2,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
            });
            cb();
          })
        },
        function (cb) {
          q.pop('c1', {
            timeout: 2000
          }, function (err, ret) {
            should.equal(ret, null);
            cb();
          })
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.stats(function (err, res) {
            res.should.eql({
              get: 0,
              put: 2,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
            });
            cb();
          })
        },
        function (cb) {
          q.pop('c2', {
            timeout: 2000
          }, function (err, ret) {
            should.equal(ret, null);
            cb();
          })
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.stats(function (err, res) {
            res.should.eql({
              get: 0,
              put: 2,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
            });
            cb();
          })
        },
        function (cb) {
          q.pop('c3', {
            timeout: 5000
          }, function (err, ret) {
            ret.payload.should.eql({
              elem: 2,
              pl: 'twetrwte'
            });
            cb(err, ret);
          })
        },
        function (cb) {
          q.pop('c4', {
            timeout: 5000
          }, function (err, ret) {
            ret.payload.should.eql({
              elem: 1,
              pl: 'twetrwte'
            });
            cb(err, ret);
          })
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.stats(function (err, res) {
            res.should.eql({
              get: 2,
              put: 2,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
            });
            cb();
          })
        },
      ], function (err, results) {
        done();
      });
    });

    it('pop cancellation works as expected', function (done) {
      var q = factory.queue('test_queue_5');

      async.series([
        function (cb) {
          q.push({
            elem: 1,
            pl: 'twetrwte'
          }, {
            delay: 6
          }, cb)
        },
        function (cb) {
          q.push({
            elem: 2,
            pl: 'twetrwte'
          }, {
            delay: 5
          }, cb)
        },
        function (cb) {
          q.consumers().length.should.equal(0);
          cb();
        },
        function (cb) {
          var tid1 = q.pop('c1', {timeout: 2000}, function (err, ret) {err.should.equal('cancel')});
          q.consumers().length.should.equal(1);
          var tid2 = q.pop('c2', {timeout: 2000}, function (err, ret) {err.should.equal('cancel')});
          q.nConsumers().should.equal(2);
          q.cancel(tid1);
          q.nConsumers().should.equal(1);
          q.cancel(tid2);
          q.nConsumers().should.equal(0);
          cb();
        },
        function (cb) {
          q.pop('c3', {
            timeout: 15000
          }, function (err, ret) {
            ret.payload.should.eql({
              elem: 2,
              pl: 'twetrwte'
            });
            cb(err, ret);
          })
        },
        function (cb) {
          q.pop('c4', {
            timeout: 15000
          }, function (err, ret) {
            ret.payload.should.eql({
              elem: 1,
              pl: 'twetrwte'
            });
            cb(err, ret);
          })
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.stats(function (err, res) {
            res.should.eql({
              get: 2,
              put: 2,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
            });
            cb();
          })
        },
      ], function (err, results) {
        done();
      });
    });

    it('simultaneous timed out pops on delayed items go in the expected order', function (done) {
      var q = factory.queue('test_queue_6');

      var hrTime = process.hrtime()

      async.series([
        function (cb) {
          q.push({
            elem: 1,
            pl: 'twetrwte'
          }, {
            delay: 6
          }, cb)
        },
        function (cb) {
          q.push({
            elem: 2,
            pl: 'twetrwte'
          }, {
            delay: 5
          }, cb)
        },
        function (cb) {
          setTimeout(function () {
            cb()
          }, 150)
        },
        function (cb) {
          q.push({
            elem: 3,
            pl: 'twetrwte'
          }, {
            delay: 4
          }, cb)
        },
        function (cb) {
          q.consumers().length.should.equal(0);
          cb();
        },
        function (cb) {
          q.stats(function (err, res) {
            res.should.eql({
              get: 0,
              put: 3,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
            });
            cb();
          })
        },
        function (cb) {
          async.parallel([
            function (cb) {
              q.pop('c1', {
                timeout: 12000
              }, function (err, ret) {
                cb(err, ret);
              })
            },
            function (cb) {
              var tid = q.pop('c0', {timeout: 12000}, function (err, ret) {err.should.equal('cancel')});

              setTimeout(function () {
                q.cancel(tid);
                cb();
              }, 3000)
            },
            function (cb) {
              q.pop('c2', {
                timeout: 12000
              }, function (err, ret) {
                cb(err, ret);
              })
            },
            function (cb) {
              q.pop('c3', {
                timeout: 12000
              }, function (err, ret) {
                cb(err, ret);
              })
            }
          ], cb);
        },
        function (cb) {
          var diff = process.hrtime(hrTime);
          var delta = (diff[0] * 1000 + diff[1] / 1000000)
          delta.should.be.approximately(6000, 500)
          cb();
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.stats(function (err, res) {
            res.should.eql({
              get: 3,
              put: 3,
              reserve: 0,
              commit: 0,
              rollback: 0,
              deadletter: 0
            });
            cb();
          })
        }
      ], function (err, results) {
        done();
      });
    });

    it('should do raw reserve & commit as expected', function (done) {
      var q = factory.queue('test_queue_7');
      var id = null;

      async.series([
        cb => q.push({elem: 1, pl: 'twetrwte'}, cb),
        cb => q.size((err, size) => {
          size.should.equal(1);
          cb();
        }),
        cb => q.next_t((err, res) => {
          res.getTime().should.be.approximately(new Date().getTime(), 500);
          cb();
        }),
        cb => q.reserve((err, res) => {
          id = res._id;
          res.payload.should.eql({
            elem: 1,
            pl: 'twetrwte'
          });
          res.tries.should.equal(0);
          cb();
        }),
        cb => q.size((err, size) => {
          size.should.equal(0);
          cb();
        }),
        cb => q.totalSize((err, size) => {
          size.should.equal(1);
          cb();
        }),
        cb => q.next_t((err, res) => {
          res.getTime().should.be.approximately(new Date().getTime() + 120000, 500);
          cb();
        }),
        cb => q.commit(id, (err, res) => {
          res.should.equal(true);
          cb();
        }),
        cb => q.size((err, size) => {
          size.should.equal(0);
          cb();
        }),
        cb => q.totalSize((err, size) => {
          size.should.equal(0);
          cb();
        }),
        cb => q.next_t((err, res) => {
          should.equal(res, null);
          cb();
        }),
      ], (err, results) => {
        done();
      });
    });

    it('should do raw reserve & rollback as expected', function (done) {
      var q = factory.queue('test_queue_8');
      var id = null;

      async.series([
        function (cb) {
          q.push({
            elem: 1,
            pl: 'twetrwte'
          }, cb)
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(1);
            cb();
          })
        },
        function (cb) {
          q.next_t(function (err, res) {
            res.getTime().should.be.approximately(new Date().getTime(), 500);
            cb();
          })
        },
        function (cb) {
          q.reserve(function (err, res) {
            id = res._id;
            res.payload.should.eql({
              elem: 1,
              pl: 'twetrwte'
            });
            res.tries.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.totalSize(function (err, size) {
            size.should.equal(1);
            cb();
          })
        },
        function (cb) {
          q.next_t(function (err, res) {
            res.getTime().should.be.approximately(new Date().getTime() + 120000, 500);
            cb();
          })
        },
        function (cb) {
          q.rollback(id, function (err, res) {
            res.should.equal(true);
            cb();
          })
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(1);
            cb();
          })
        },
        function (cb) {
          q.totalSize(function (err, size) {
            size.should.equal(1);
            cb();
          })
        },
        function (cb) {
          q.next_t(function (err, res) {
            res.getTime().should.be.approximately(new Date().getTime(), 500);
            cb();
          })
        },
        function (cb) {
          q.commit(id, function (err, res) {
            res.should.equal(false);
            cb();
          })
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(1);
            cb();
          })
        },
        function (cb) {
          q.totalSize(function (err, size) {
            size.should.equal(1);
            cb();
          })
        },
        function (cb) {
          q.next_t(function (err, res) {
            res.getTime().should.be.approximately(new Date().getTime(), 500);
            cb();
          })
        },
        function (cb) {
          q.get(function (err, res) {
            res._id.should.eql(id);
            res.payload.should.eql({
              elem: 1,
              pl: 'twetrwte'
            });
            res.tries.should.equal(1);
            cb();
          })
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.totalSize(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.next_t(function (err, res) {
            should.equal(res, null);
            cb();
          })
        },
      ], function (err, results) {
        done();
      });
    });

    it('should do get.reserve & ok as expected', function (done) {
      var q = factory.queue('test_queue_9');
      var id = null;

      async.series([
        function (cb) {
          q.push({
            elem: 1,
            pl: 'twetrwte'
          }, cb)
        },
        function (cb) {
          q.pop('c1', {
            reserve: true
          }, function (err, res) {
            id = res._id;
            res.payload.should.eql({
              elem: 1,
              pl: 'twetrwte'
            });
            res.tries.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.totalSize(function (err, size) {
            size.should.equal(1);
            cb();
          })
        },
        function (cb) {
          q.next_t(function (err, res) {
            res.getTime().should.be.approximately(new Date().getTime() + 120000, 500);
            cb();
          })
        },
        function (cb) {
          q.ok(id, function (err, res) {
            res.should.equal(true);
            cb();
          })
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.totalSize(function (err, size) {
            size.should.equal(0);
            cb();
          })
        },
        function (cb) {
          q.next_t(function (err, res) {
            should.equal(res, null);
            cb();
          })
        },
        cb => setTimeout (cb, 1000),
        cb => q.stats((err, res) => {
          res.should.eql({
            get: 0,
            put: 1,
            reserve: 1,
            commit: 1,
            rollback: 0,
            deadletter: 0
          });
          cb();
        }),
      ], function (err, results) {
        done();
      });
    });

    it('should manage rollback on invalid id as expected', function (done) {
      if (MQ_item.label == 'Redis OrderedQueue') return done ();

      var q = factory.queue('test_queue_10');

      async.series([
        function (cb) {
          q.rollback('invalid-id', function (err, res) {
            err.should.not.be.null
            should(res).equal(undefined);
            cb();
          })
        }
      ], function (err, results) {
        done(err);
      });
    });

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

      var q = factory.queue('test_queue_11');
      var state = {};

      async.series([
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
          cb (null, res._id);
        }),
        cb => _get_all_sizes (q, cb),
        cb => q.ok (state.reserved_id, cb),
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
          [ 3, 1, 1, 1 ],
          [ 3, 2, 1, 0 ],
          [ 3, 1, 1, 1 ],
          [ 2, 1, 1, 0 ],
          [ 0, 0, 0, 0 ] ]);

        done ();
      });
    });

    it('should manage rollback on unknown id as expected', function (done) {
      var q = factory.queue('test_queue_12');

      async.series([
        function (cb) {
          q.rollback('112233445566778899001122', function (err, res) {
            should(err).equal(null)
            should(res).equal(false);
            cb();
          })
        }
      ], function (err, results) {
        done(err);
      });
    });


    it('should rollback ok using full object', done => {
      var q = factory.queue('test_queue_13');
      var state = {};

      async.series([
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
          res.should.eql({
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
