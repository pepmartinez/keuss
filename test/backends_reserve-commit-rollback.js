var async = require('async');
var should = require('should');
var MongoClient = require ('mongodb').MongoClient;

var factory = null;

[
  {label: 'Simple MongoDB',     mq: require ('../backends/mongo')},
  {label: 'Pipelined MongoDB',  mq: require ('../backends/pl-mongo')},
  {label: 'Tape MongoDB',       mq: require ('../backends/ps-mongo')},
  {label: 'Redis OrderedQueue', mq: require ('../backends/redis-oq')}
].forEach(function (MQ_item) {
  describe('reserve-commit-rollback with ' + MQ_item.label + ' queue backend', function () {
    var MQ = MQ_item.mq;

    before(function (done) {
      var opts = {
        url: 'mongodb://localhost/keuss_test_backends_rcr',
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

    it('queue is created empty and ok', function (done) {
      var q = factory.queue('test_queue');
      should.equal(q.nextMatureDate(), null);

      async.series([
        function (cb) {
          q.stats(cb)
        },
        function (cb) {
          q.size(cb)
        },
        function (cb) {
          q.totalSize(cb)
        },
        function (cb) {
          q.next_t(cb)
        },
      ], function (err, results) {
        results.should.eql([{
          get: 0,
          put: 0
        }, 0, 0, null])
        done();
      });
    });

    it('sequential push & pops with no delay, go as expected', function (done) {
      var q = factory.queue('test_queue');

      async.series([
        function (cb) {
          q.push({
            elem: 1,
            pl: 'twetrwte'
          }, cb)
        },
        function (cb) {
          q.push({
            elem: 2,
            pl: 'twetrwte'
          }, cb)
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(2);
            cb();
          })
        },
        function (cb) {
          q.stats(function (err, res) {
            res.should.eql({
              get: 0,
              put: 2
            });
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
          q.pop('c1', cb)
        },
        function (cb) {
          q.size(function (err, size) {
            size.should.equal(1);
            cb();
          })
        },
        function (cb) {
          q.stats(function (err, res) {
            res.should.eql({
              get: 1,
              put: 2
            });
            cb();
          })
        },
        function (cb) {
          q.pop('c2', cb)
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
              put: 2
            });
            cb();
          })
        },
        function (cb) {
          q.next_t(function (err, res) {
            should.equal(res, null);
            cb();
          })
        }
      ], function (err, results) {
        done();
      });
    });


    it('sequential push & pops with delays, go as expected', function (done) {
      var q = factory.queue('test_queue');

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
              put: 2
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
              put: 2
            });
            cb();
          })
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
              put: 2
            });
            cb();
          })
        },
        function (cb) {
          q.next_t(function (err, res) {
            should.equal(res, null);
            cb();
          })
        }
      ], function (err, results) {
        done();
      });
    });


    it('timed-out pops work as expected', function (done) {
      var q = factory.queue('test_queue');

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
              put: 2
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
              put: 2
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
              put: 2
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
              put: 2
            });
            cb();
          })
        },
      ], function (err, results) {
        done();
      });
    });


    it('pop cancellation works as expected', function (done) {
      var q = factory.queue('test_queue');

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
              put: 2
            });
            cb();
          })
        },
      ], function (err, results) {
        done();
      });
    });

    it('simultaneous timed out pops on delayed items go in the expected order', function (done) {
      var q = factory.queue('test_queue');

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
              put: 3
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
              put: 3
            });
            cb();
          })
        }
      ], function (err, results) {
        done();
      });
    });

    it('should do raw reserve & commit as expected', function (done) {
      var q = factory.queue('test_queue');
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
          q.commit(id, function (err, res) {
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
        }
      ], function (err, results) {
        done();
      });
    });

    it('should do raw reserve & rollback as expected', function (done) {
      var q = factory.queue('test_queue');
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
        }
      ], function (err, results) {
        done();
      });
    });

    it('should do get.reserve & ok as expected', function (done) {
      var q = factory.queue('test_queue');
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
        }
      ], function (err, results) {
        done();
      });
    });

    it('should manage rollback on invalid id as expected', function (done) {
      if (MQ_item.label == 'Redis OrderedQueue') return done ();

      var q = factory.queue('test_queue');
      var id = null;

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

    it('should manage rollback on unknown id as expected', function (done) {
      var q = factory.queue('test_queue');
      var id = null;

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
  });
});
