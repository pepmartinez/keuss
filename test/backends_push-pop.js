
const async =  require ('async');
const should = require ('should');

let factory = null;


process.on('unhandledRejection', (err, p) => {
  console.error('unhandledRejection', err.stack, p)
});

[
  {label: 'Redis List', mq: require ('../backends/redis-list')}
].forEach (MQ_item => {
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe ('push-pop with ' + MQ_item.label + ' queue backend', () => {
    const MQ = MQ_item.mq;

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    before (done => {
      const opts = {};

      MQ (opts, (err, fct) => {
        if (err) return done (err);
        factory = fct;
        done();
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    after (done => async.series ([
      cb => setTimeout (cb, 1000),
      cb => factory.close (cb)
    ], done));


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it ('queue is created empty and ok', done => {
      factory.queue('test_queue', (err, q) => {
        if (err) return done (err);

        should.equal (q.nextMatureDate (), null);
        q.name ().should.equal ('test_queue');

        async.series([
          cb => q.stats(cb),
          cb => q.size (cb),
          cb => q.totalSize (cb),
          cb => q.next_t (cb),
        ], (err, results) =>  {
          if (err) return done (err);
          results.should.eql ([{get: 0, put: 0}, 0, 0, null])
          done();
        });
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it ('sequential push & pops with no delay, go as expected', done => {
      factory.queue('test_queue', (err, q) => {
        if (err) return done (err);

        async.series([
          cb => q.push ({elem:1, pl:'twetrwte'}, cb),
          cb => q.push ({elem:2, pl:'twetrwte'}, cb),
          cb => q.size ((err, size) => {
            size.should.equal (2);
            cb();
          }),
          cb => q.stats ((err, res) => {
            res.should.eql ({get: 0, put: 2});
            cb();
          }),
          cb => q.next_t ((err, res) => {
            should.equal (res, null);
            cb();
          }),
          cb => q.pop ('c1', cb),
          cb => q.size ((err, size) => {
            size.should.equal (1);
            cb();
          }),
          cb => q.stats ((err, res) => {
            res.should.eql ({get: 1, put: 2});
            cb();
          }),
          cb => q.pop ('c2', cb),
          cb => q.size ((err, size) => {
            size.should.equal (0);
            cb();
          }),
          cb => q.stats ((err, res) => {
            res.should.eql ({get: 2, put: 2});
            cb();
          }),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it ('sequential push & pops with delays, go as expected (delays are ignored)', done => {
      factory.queue('test_queue', (err, q) => {
        if (err) return done (err);

        async.series([
          cb => q.push ({elem:1, pl:'twetrwte'}, {delay:2}, cb),
          cb => q.push ({elem:2, pl:'twetrwte'}, {delay:1}, cb),
          cb => q.size ((err, size) => {
            size.should.equal (2);
            cb();
          }),
          cb => q.stats ((err, res) => {
            res.should.eql ({get: 0, put: 2});
            cb();
          }),
          cb => q.pop ('c1', (err, ret) => {
            ret.payload.should.eql ({elem:1, pl:'twetrwte'});
            cb (err, ret);
          }),
          cb => q.size ((err, size) => {
            size.should.equal (1);
            cb();
          }),
          cb => q.stats ((err, res) => {
            res.should.eql ({get: 1, put: 2});
            cb();
          }),
          cb => q.pop ('c2', (err, ret) => {
            ret.payload.should.eql ({elem:2, pl:'twetrwte'});
            cb (err, ret);
          }),
          cb => q.size ((err, size) => {
            size.should.equal (0);
            cb();
          }),
          cb => q.stats ((err, res) => {
            res.should.eql ({get: 2, put: 2});
            cb();
          }),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it ('pop cancellation works as expected', done => {
      factory.queue('test_queue', (err, q) => {
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
          cb => q.push ({elem:2, pl:'twetrwte'}, cb),
          cb => q.push ({elem:1, pl:'twetrwte'}, cb),
          cb => q.pop ('c3', {timeout: 15000}, (err, ret) => {
            ret.payload.should.eql ({elem:2, pl:'twetrwte'});
            cb (err, ret);
          }),
          cb => q.pop ('c4', {timeout: 15000}, (err, ret) => {
            ret.payload.should.eql ({elem:1, pl:'twetrwte'});
            cb (err, ret);
          }),
          cb => q.size ((err, size) => {
            size.should.equal (0);
            cb();
          }),
          cb => q.stats ((err, res) => {
            res.should.eql ({get: 2, put: 2});
            cb();
          }),
        ], done);
      });
    });
  });
});
