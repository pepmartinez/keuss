const async =  require ('async');
const should = require ('should');
const _ =      require ('lodash');

const LocalSignal = require ('../signal/local');
const MemStats =    require ('../stats/mem');

const MongoClient = require ('mongodb').MongoClient;


process.on('unhandledRejection', (err, p) => {
  console.error('unhandledRejection', err.stack, p)
})

let factory = null;

[
  {label: 'Simple MongoDB',       mq: require ('../backends/mongo')},
  {label: 'Pipelined MongoDB',    mq: require ('../backends/pl-mongo')},
  {label: 'Tape MongoDB',         mq: require ('../backends/ps-mongo')},
  {label: 'Stream MongoDB',       mq: require ('../backends/stream-mongo')},
  {label: 'Safe MongoDB Buckets', mq: require ('../backends/bucket-mongo-safe')},
  {label: 'Redis List',           mq: require ('../backends/redis-list')},
  {label: 'Redis OrderedQueue',   mq: require ('../backends/redis-oq')},
  {label: 'Mongo IntraOrder',     mq: require ('../backends/intraorder')},
  {label: 'Postgres',             mq: require ('../backends/postgres')},
].forEach(MQ_item => {
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe('payload aspects on ' + MQ_item.label + ' queue backend, round 1', () => {
    const MQ = MQ_item.mq;

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    before(done => {
      const opts = {
        url: 'mongodb://localhost/keuss_test_backends_payload',
        signaller: { provider: LocalSignal},
        stats: {provider: MemStats}
      };

      MQ (opts, (err, fct) => {
        if (err) return done(err);
        factory = fct;
        done();
      });
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    after (done => async.series ([
      cb => setTimeout (cb, 1000),
      cb => factory.close (cb),
      cb => MongoClient.connect ('mongodb://localhost/keuss_test_backends_payload', (err, cl) => {
        if (err) return done (err);
        cl.db().dropDatabase (() => cl.close (cb))
      })
    ], done));


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and pop json object payloads ok', done => {
      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);

        async.series([
          cb => q.push ({a:1, b:'2'}, cb),
          cb => q.pop ('me', (err, res) => {
            if (err) return db (err);
            res.payload.should.eql ({a:1, b:'2'});
            res.tries.should.equal (0);
            res.hdrs.should.eql ({});
            cb (null, res);
          }),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and pop json array payloads ok', done => {
      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);

        async.series([
          cb => q.push ([{a:1}, {b:'2'}, 4, 'yyy'], cb),
          cb => q.pop ('me', (err, res) => {
            if (err) return db (err);
            res.payload.should.eql ([{a:1}, {b:'2'}, 4, 'yyy']);
            res.tries.should.equal (0);
            res.hdrs.should.eql ({});
            cb (null, res);
          }),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and pop string payloads ok', done => {
      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);

        async.series([
          cb => q.push ("das payload", cb),
          cb => q.pop ('me', (err, res) => {
            if (err) return db (err);
            res.payload.should.eql ("das payload");
            res.tries.should.equal (0);
            res.hdrs.should.eql ({});
            cb (null, res);
          }),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and pop number payloads ok', done => {
      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);

        async.series([
          cb => q.push (123456, cb),
          cb => q.pop ('me', (err, res) => {
            if (err) return db (err);
            res.payload.should.eql (123456);
            res.tries.should.equal (0);
            res.hdrs.should.eql ({});
            cb (null, res);
          }),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and pop Buffer payloads ok', done => {
      const bf = Buffer.from ([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]);
      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);
        
        async.series([
          cb => q.push (bf, cb),
          cb => q.pop ('me', (err, res) => {
            if (err) return db (err);
            res.payload.should.eql (bf);
            res.tries.should.equal (0);
            res.hdrs.should.eql ({});
            cb (null, res);
          }),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and pop json object payloads ok with headers', done => {
      const hdrs = {
        aaa: 'qwerty',
        bbb: 12,
        ccc: true,
        ddd: 12.34
      };

      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);
        async.series([
          cb => q.push ({a:1, b:'2'}, {hdrs}, cb),
          cb => q.pop ('me', (err, res) => {
            if (err) return db (err);
            res.payload.should.eql ({a:1, b:'2'});
            res.tries.should.equal (0);
            res.hdrs.should.eql (hdrs);
            cb (null, res);
          }),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and pop json array payloads ok with headers', done => {
      const hdrs = {
        aaa: 'qwerty',
        bbb: 12,
        ccc: true,
        ddd: 12.34
      };

      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);
        async.series([
          cb => q.push ([{a:1}, {b:'2'}, 4, 'yyy'], {hdrs}, cb),
          cb => q.pop ('me', (err, res) => {
            if (err) return db (err);
            res.payload.should.eql ([{a:1}, {b:'2'}, 4, 'yyy']);
            res.tries.should.equal (0);
            res.hdrs.should.eql (hdrs);
            cb (null, res);
          }),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and pop string payloads ok with headers', done => {
      const hdrs = {
        aaa: 'qwerty',
        bbb: 12,
        ccc: true,
        ddd: 12.34
      };

      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);

        async.series([
          cb => q.push ("das payload", {hdrs}, cb),
          cb => q.pop ('me', (err, res) => {
            if (err) return db (err);
            res.payload.should.eql ("das payload");
            res.tries.should.equal (0);
            res.hdrs.should.eql (hdrs);
            cb (null, res);
          }),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and pop number payloads ok with headers', done => {
      const hdrs = {
        aaa: 'qwerty',
        bbb: 12,
        ccc: true,
        ddd: 12.34
      };

      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);

        async.series([
          cb => q.push (123456, {hdrs}, cb),
          cb => q.pop ('me', (err, res) => {
            if (err) return db (err);
            res.payload.should.eql (123456);
            res.tries.should.equal (0);
            res.hdrs.should.eql (hdrs);
            cb (null, res);
          }),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and pop Buffer payloads ok with headers', done => {
      const bf = Buffer.from ([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]);
      const hdrs = {
        aaa: 'qwerty',
        bbb: 12,
        ccc: true,
        ddd: 12.34
      };

      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);

        async.series([
          cb => q.push (bf, {hdrs}, cb),
          cb => q.pop ('me', (err, res) => {
            if (err) return db (err);
            res.payload.should.eql (bf);
            res.tries.should.equal (0);
            res.hdrs.should.eql (hdrs);
            cb (null, res);
          }),
        ], done);
      });
    });
  });
});


[
  {label: 'Simple MongoDB',       mq: require ('../backends/mongo')},
  {label: 'Pipelined MongoDB',    mq: require ('../backends/pl-mongo')},
  {label: 'Tape MongoDB',         mq: require ('../backends/ps-mongo')},
  {label: 'Stream MongoDB',       mq: require ('../backends/stream-mongo')},
  {label: 'Safe MongoDB Buckets', mq: require ('../backends/bucket-mongo-safe')},
  {label: 'Redis OrderedQueue',   mq: require ('../backends/redis-oq')},
  {label: 'Postgres',             mq: require ('../backends/postgres')},
].forEach(function (MQ_item) {
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe('payload aspects on ' + MQ_item.label + ' queue backend, round 2', function () {
    const MQ = MQ_item.mq;

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    before(done => {
      const opts = {
        url: 'mongodb://localhost/keuss_test_backends_payload',
        signaller: { provider: LocalSignal},
        stats: {provider: MemStats}
      };

      MQ (opts, (err, fct) => {
        if (err) return done(err);
        factory = fct;
        done();
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    after (done => async.series ([
      cb => setTimeout (cb, 1000),
      cb => factory.close (cb),
      cb => MongoClient.connect ('mongodb://localhost/keuss_test_backends_payload', (err, cl) => {
        if (err) return done (err);
        cl.db().dropDatabase (() => cl.close (cb))
      })
    ], done));


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and reserve json object payloads ok', done => {
      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);
        const state = {};

        async.series([
          cb => q.push ({a:1, b:'2'}, cb),
          cb => q.pop ('me', {reserve: true}, (err, res) => {
            if (err) return db (err);
            state.reserved_id = res._id;
            res.payload.should.eql ({a:1, b:'2'});
            res.tries.should.equal (0);
            res.hdrs.should.eql ({});
            cb (null, res);
          }),
          cb => q.ok (state.reserved_id, cb),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and reserve json array payloads ok', done => {
      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);
        const state = {};

        async.series([
          cb => q.push ([{a:1}, {b:'2'}, 4, 'yyy'], cb),
          cb => q.pop ('me', {reserve: true}, (err, res) => {
            if (err) return db (err);
            state.reserved_id = res._id;
            res.payload.should.eql ([{a:1}, {b:'2'}, 4, 'yyy']);
            res.tries.should.equal (0);
            res.hdrs.should.eql ({});
            cb (null, res);
          }),
          cb => q.ok (state.reserved_id, cb),
        ],done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and reserve string payloads ok', done => {
      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);
        const state = {};

        async.series([
          cb => q.push ("das payload", cb),
          cb => q.pop ('me', {reserve: true}, (err, res) => {
            if (err) return db (err);
            state.reserved_id = res._id;
            res.payload.should.eql ("das payload");
            res.tries.should.equal (0);
            res.hdrs.should.eql ({});
            cb (null, res);
          }),
          cb => q.ok (state.reserved_id, cb),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and reserve number payloads ok', done => {
      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);
        const state = {};

        async.series([
          cb => q.push (123456, cb),
          cb => q.pop ('me', {reserve: true}, (err, res) => {
            if (err) return db (err);
            state.reserved_id = res._id;
            res.payload.should.eql (123456);
            res.tries.should.equal (0);
            res.hdrs.should.eql ({});
            cb (null, res);
          }),
          cb => q.ok (state.reserved_id, cb),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and reserve Buffer payloads ok', done => {
      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);
        const state = {};
        const bf = Buffer.from ([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]);

        async.series([
          cb => q.push (bf, cb),
          cb => q.pop ('me', {reserve: true}, (err, res) => {
            if (err) return db (err);
            state.reserved_id = res._id;
            res.payload.should.eql (bf);
            res.tries.should.equal (0);
            res.hdrs.should.eql ({});
            cb (null, res);
          }),
          cb => q.ok (state.reserved_id, cb),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and reserve json object payloads ok with headers', done => {
      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);
        const state = {};
        const hdrs = {
          aaa: 'qwerty',
          bbb: 12,
          ccc: true,
          ddd: 12.34
        };

        async.series([
          cb => q.push ({a:1, b:'2'}, {hdrs}, cb),
          cb => q.pop ('me', {reserve: true}, (err, res) => {
            if (err) return db (err);
            state.reserved_id = res._id;
            res.payload.should.eql ({a:1, b:'2'});
            res.tries.should.equal (0);
            res.hdrs.should.eql (hdrs);
            cb (null, res);
          }),
          cb => q.ok (state.reserved_id, cb),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and reserve json array payloads ok with headers', done => {
      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);
        const state = {};
        const hdrs = {
          aaa: 'qwerty',
          bbb: 12,
          ccc: true,
          ddd: 12.34
        };

        async.series([
          cb => q.push ([{a:1}, {b:'2'}, 4, 'yyy'], {hdrs}, cb),
          cb => q.pop ('me', {reserve: true}, (err, res) => {
            if (err) return db (err);
            state.reserved_id = res._id;
            res.payload.should.eql ([{a:1}, {b:'2'}, 4, 'yyy']);
            res.tries.should.equal (0);
            res.hdrs.should.eql (hdrs);
            cb (null, res);
          }),
          cb => q.ok (state.reserved_id, cb),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and reserve string payloads ok with headers', done => {
      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);
        const state = {};
        const hdrs = {
          aaa: 'qwerty',
          bbb: 12,
          ccc: true,
          ddd: 12.34
        };

        async.series([
          cb => q.push ("das payload", {hdrs}, cb),
          cb => q.pop ('me', {reserve: true}, (err, res) => {
            if (err) return db (err);
            state.reserved_id = res._id;
            res.payload.should.eql ("das payload");
            res.tries.should.equal (0);
            res.hdrs.should.eql (hdrs);
            cb (null, res);
          }),
          cb => q.ok (state.reserved_id, cb),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and reserve number payloads ok with headers', done => {
      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);
        const state = {};
        const hdrs = {
          aaa: 'qwerty',
          bbb: 12,
          ccc: true,
          ddd: 12.34
        };

        async.series([
          cb => q.push (123456, {hdrs}, cb),
          cb => q.pop ('me', {reserve: true}, (err, res) => {
            if (err) return db (err);
            state.reserved_id = res._id;
            res.payload.should.eql (123456);
            res.tries.should.equal (0);
            res.hdrs.should.eql (hdrs);
            cb (null, res);
          }),
          cb => q.ok (state.reserved_id, cb),
        ], done);
      });
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('should insert and reserve Buffer payloads ok with headers', done => {
      factory.queue('test_queue_1', (err, q) => {
        if (err) return done (err);
        const state = {};
        const hdrs = {
          aaa: 'qwerty',
          bbb: 12,
          ccc: true,
          ddd: 12.34
        };

        const bf = Buffer.from ([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]);

        async.series([
          cb => q.push (bf, {hdrs}, cb),
          cb => q.pop ('me', {reserve: true}, (err, res) => {
            if (err) return db (err);
            state.reserved_id = res._id;
            res.payload.should.eql (bf);
            res.tries.should.equal (0);
            res.hdrs.should.eql (hdrs);
            cb (null, res);
          }),
          cb => q.ok (state.reserved_id, cb),
        ], done);
      });
    });
  });
});
