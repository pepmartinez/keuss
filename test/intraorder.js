const async =  require ('async');
const should = require ('should');
const _ =      require ('lodash');

const LocalSignal = require ('../signal/local');
const MemStats =    require ('../stats/mem');

const MongoClient = require ('mongodb').MongoClient;


const MQ = require ('../backends/intraorder');

var factory = null;


  describe('IntraOrder backend: specific operations', () => {

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    before(done => {
      var opts = {
        url: 'mongodb://localhost/keuss_test_intraorder',
        signaller: {provider: LocalSignal},
        stats: {provider: MemStats}
      };

      MQ(opts, (err, fct) => {
        if (err) return done(err);
        factory = fct;
        done();
      });
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    after (done => async.series ([
      cb => setTimeout (cb, 1000),
      cb => factory.close (cb),
      cb => MongoClient.connect ('mongodb://localhost/keuss_test_intraorder', (err, cl) => {
        if (err) return done (err);
        cl.db().dropDatabase (() => cl.close (cb))
      })
    ], done));


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('sequential push & pops with no retries preserves order', done => {
      const q = factory.queue('test_queue_1');

      async.series([
        cb => q.push({elem: 1, iid: 'twetrwte', pl: {d: 't-', a: 56}}, cb),
        cb => q.push({elem: 2, iid: 'twetrwte', pl: {d: 't--', a: 156}}, cb),
        cb => q.push({elem: 3, iid: 'twetrwte', pl: {d: 't---', a: 256}}, cb),
        cb => q.push({elem: 4, iid: 'twetrwte', pl: {d: 't----', a: 356}}, cb),
        cb => q.push({elem: 5, iid: 'twetrwte', pl: {d: 't-----', a: 456}}, cb),
        cb => {
          q.size ((err, size) => {
            if (err) return done (err);
            size.should.equal(5);
            cb();
          })
        },
        cb => q.stats((err, res) => {
          if (err) return done (err);
          res.should.match({
            get: 0,
            put: 5,
            reserve: 0,
            commit: 0,
            rollback: 0, 
            deadletter: 0
          });
          cb();
        }),
        cb => q.pop('c1', cb),
        cb => q.pop('c1', cb),
        cb => q.pop('c1', cb),
        cb => q.pop('c1', cb),
        cb => q.pop('c1', cb),
        cb => q.size((err, size) => {
          if (err) return done (err);
          size.should.equal(0);
          cb();
        }),
        cb => q.stats((err, res) => {
          if (err) return done (err);
          res.should.match({
            get: 5,
            put: 5,
            reserve: 0,
            commit: 0,
            rollback: 0,
            deadletter: 0
          });
          cb();
        }),
      ], (err, results) => {
        if (err) return done (err);
        results[7].payload.should.eql ({ elem: 1, iid: 'twetrwte', pl: { d: 't-', a: 56 } });
        results[8].payload.should.eql ({ elem: 2, iid: 'twetrwte', pl: { d: 't--', a: 156 } });
        results[9].payload.should.eql ({ elem: 3, iid: 'twetrwte', pl: { d: 't---', a: 256 } });
        results[10].payload.should.eql ({ elem: 4, iid: 'twetrwte', pl: { d: 't----', a: 356 } });
        results[11].payload.should.eql ({ elem: 5, iid: 'twetrwte', pl: { d: 't-----', a: 456 } });
        done();
      });
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('sequential reserve-commit with retries preserves order', done => {
      const q = factory.queue('test_queue_2');
      const t0 = process.hrtime();
      async.series([
        cb => q.push({elem: 1, iid: 'twetrwte', pl: {d: 't-', a: 56}}, cb),
        cb => q.push({elem: 2, iid: 'twetrwte', pl: {d: 't--', a: 156}}, cb),
        cb => q.push({elem: 3, iid: 'twetrwte', pl: {d: 't---', a: 256}}, cb),
        cb => q.push({elem: 4, iid: 'twetrwte', pl: {d: 't----', a: 356}}, cb),
        cb => q.push({elem: 5, iid: 'twetrwte', pl: {d: 't-----', a: 456}}, cb),

        cb => q.pop('c1', {reserve: true}, (err, res) => {
          if (err) return done (err);
          res.payload.should.eql ({ elem: 1, iid: 'twetrwte', pl: { d: 't-', a: 56 } });
          q.ko (res, new Date().getTime () + 2000, cb)
        }),

        cb => q.pop('c1', {reserve: true}, (err, res) => {
          if (err) return done (err);
          res.payload.should.eql ({ elem: 1, iid: 'twetrwte', pl: { d: 't-', a: 56 } });
          q.ko (res, new Date().getTime () + 3000, cb)
        }),

        cb => q.pop('c1', {reserve: true}, (err, res) => {
          if (err) return done (err);
          res.payload.should.eql ({ elem: 1, iid: 'twetrwte', pl: { d: 't-', a: 56 } });
          q.ko (res, new Date().getTime () + 1000, cb)
        }),

//        cb => q.pop('c1', (err, res) => {console.log (new Date().toISOString (), res.payload); cb (err, res)}),

        cb => q.pop('c1', cb),
        cb => q.pop('c1', cb),
        cb => q.pop('c1', cb),
        cb => q.pop('c1', cb),
        cb => q.pop('c1', cb),

        cb => q.size((err, size) => {
          if (err) return done (err);
          size.should.equal(0);
          cb();
        }),
      ], (err, results) => {
        if (err) return done (err);

        // duration must be about 6 secs
        const delta = process.hrtime(t0);
        delta[0].should.eql (6);
        results[8].payload.should.eql ({ elem: 1, iid: 'twetrwte', pl: { d: 't-', a: 56 } });
        results[9].payload.should.eql ({ elem: 2, iid: 'twetrwte', pl: { d: 't--', a: 156 } });
        results[10].payload.should.eql ({ elem: 3, iid: 'twetrwte', pl: { d: 't---', a: 256 } });
        results[11].payload.should.eql ({ elem: 4, iid: 'twetrwte', pl: { d: 't----', a: 356 } });
        results[12].payload.should.eql ({ elem: 5, iid: 'twetrwte', pl: { d: 't-----', a: 456 } });
        done();
      });
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('parallel reserve-commit on same iid blocks until commit', done => {
      const q = factory.queue('test_queue_3');
      const t0 = process.hrtime();
      const pops = [];

      async.series([
        cb => q.push({elem: 1, iid: 'twetrwte', pl: {d: 't-', a: 56}}, cb),
        cb => q.push({elem: 2, iid: 'twetrwte', pl: {d: 't--', a: 156}}, cb),
        cb => q.push({elem: 3, iid: 'twetrwte', pl: {d: 't---', a: 256}}, cb),

        cb => async.parallel ([
          cb => {
            let elem;
            async.series ([
              cb => setTimeout (cb, 500),
              cb => q.pop('c1', {reserve: true}, (err, res) => {elem = res; pops.push (res); cb (err); }),
              cb => setTimeout (cb, 1500),
              cb => q.ok (elem, cb),
            ], cb);
          },
          cb => {
            let elem;
            async.series ([
              cb => setTimeout (cb, 1000),
              cb => q.pop('c1', {reserve: true}, (err, res) => {elem = res; pops.push (res);; cb (err); }),
              cb => setTimeout (cb, 1500),
              cb => q.ok (elem, cb),
            ], cb);
          },
          cb => {
            let elem;
            async.series ([
              cb => setTimeout (cb, 1500),
              cb => q.pop('c1', {reserve: true}, (err, res) => {elem = res; pops.push (res);; cb (err); }),
              cb => setTimeout (cb, 1500),
              cb => q.ok (elem, cb),
            ], cb);
          },
        ], cb)
      ], (err, results) => {
        if (err) return done (err);
        
        pops[0].payload.should.eql ({ elem: 1, iid: 'twetrwte', pl: { d: 't-', a: 56 } });
        pops[1].payload.should.eql ({ elem: 2, iid: 'twetrwte', pl: { d: 't--', a: 156 } });
        pops[2].payload.should.eql ({ elem: 3, iid: 'twetrwte', pl: { d: 't---', a: 256 } });

        // duration must be about 6 secs
        const delta = process.hrtime(t0);

        // queue pop won't rearm after commit... so it will timeout after a min and only then rearm again for next pop/reserve
//        delta[0].should.eql (7);
        done();
      });
    });


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('parallel reserve-commit on same iid blocks until rollback', done => {
      const q = factory.queue('test_queue_4');
      const t0 = process.hrtime();
      const pops = [];

      async.series([
        cb => q.push({elem: 1, iid: 'twetrwte', pl: {d: 't-', a: 56}}, cb),
        cb => q.push({elem: 2, iid: 'twetrwte', pl: {d: 't--', a: 156}}, cb),
        cb => q.push({elem: 3, iid: 'twetrwte', pl: {d: 't---', a: 256}}, cb),

        cb => async.parallel ([
          cb => {
            let elem;
            async.series ([
              cb => setTimeout (cb, 500),
              cb => q.pop('c1', {reserve: true}, (err, res) => {elem = res; pops.push (res); cb (err); }),
              cb => q.ko (elem, new Date().getTime () + 1000, cb),
            ], cb);
          },
          cb => {
            let elem;
            async.series ([
              cb => setTimeout (cb, 700),
              cb => q.pop('c1', {reserve: true}, (err, res) => {elem = res; pops.push (res);; cb (err); }),
              cb => q.ko (elem, new Date().getTime () + 1000, cb),
            ], cb);
          },
          cb => {
            let elem;
            async.series ([
              cb => setTimeout (cb, 1500),
              cb => q.pop('c1', {reserve: true}, (err, res) => {elem = res; pops.push (res);; cb (err); }),
              cb => setTimeout (cb, 1500),
              cb => q.ok (elem, cb),
            ], cb);
          },
          cb => {
            let elem;
            async.series ([
              cb => setTimeout (cb, 2000),
              cb => q.pop('c1', {reserve: true}, (err, res) => {elem = res; pops.push (res);; cb (err); }),
              cb => setTimeout (cb, 1500),
              cb => q.ok (elem, cb),
            ], cb);
          },
          cb => {
            let elem;
            async.series ([
              cb => setTimeout (cb, 2500),
              cb => q.pop('c1', {reserve: true}, (err, res) => {elem = res; pops.push (res);; cb (err); }),
              cb => setTimeout (cb, 1500),
              cb => q.ok (elem, cb),
            ], cb);
          },
        ], cb)
      ], (err, results) => {
        if (err) return done (err);
        
        pops[0].payload.should.eql ({ elem: 1, iid: 'twetrwte', pl: { d: 't-', a: 56 } });
        pops[1].payload.should.eql ({ elem: 1, iid: 'twetrwte', pl: { d: 't-', a: 56 } });
        pops[2].payload.should.eql ({ elem: 1, iid: 'twetrwte', pl: { d: 't-', a: 56 } });
        pops[3].payload.should.eql ({ elem: 2, iid: 'twetrwte', pl: { d: 't--', a: 156 } });
        pops[4].payload.should.eql ({ elem: 3, iid: 'twetrwte', pl: { d: 't---', a: 256 } });

        // duration must be about 6 secs
        const delta = process.hrtime(t0);

        // queue pop won't rearm after commit... so it will timeout after a min and only then rearm again for next pop/reserve
//        delta[0].should.eql (7);
        done();
      });
    });

    
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('delayed push preserves order', done => {
      const q = factory.queue('test_queue_1');

      async.series([
        cb => q.push({elem: 1, iid: 'twetrwte', pl: {d: 't-', a: 56}}, {delay: 5}, cb),
        cb => q.push({elem: 2, iid: 'twetrwte', pl: {d: 't--', a: 156}}, {delay: 4}, cb),
        cb => q.push({elem: 3, iid: 'twetrwte', pl: {d: 't---', a: 256}}, {delay: 3}, cb),
        cb => q.push({elem: 4, iid: 'twetrwte', pl: {d: 't----', a: 356}}, {delay: 2}, cb),
        cb => q.push({elem: 5, iid: 'twetrwte', pl: {d: 't-----', a: 456}}, {delay: 1}, cb),
        cb => q.pop('c1', cb),
        cb => q.pop('c1', cb),
        cb => q.pop('c1', cb),
        cb => q.pop('c1', cb),
        cb => q.pop('c1', cb),
      ], (err, results) => {
        if (err) return done (err);
        results[5].payload.should.eql ({ elem: 1, iid: 'twetrwte', pl: { d: 't-', a: 56 } });
        results[6].payload.should.eql ({ elem: 2, iid: 'twetrwte', pl: { d: 't--', a: 156 } });
        results[7].payload.should.eql ({ elem: 3, iid: 'twetrwte', pl: { d: 't---', a: 256 } });
        results[8].payload.should.eql ({ elem: 4, iid: 'twetrwte', pl: { d: 't----', a: 356 } });
        results[9].payload.should.eql ({ elem: 5, iid: 'twetrwte', pl: { d: 't-----', a: 456 } });
        done();
      });
    });


  });
