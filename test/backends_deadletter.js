var async =  require ('async');
var should = require ('should');
var _ =      require ('lodash');

var LocalSignal = require ('../signal/local');
var MemStats =    require ('../stats/mem');

const MongoClient = require ('mongodb').MongoClient;

process.on('unhandledRejection', (err, p) => {
  console.error('unhandledRejection', err.stack, p)
})

function stats (q, cb) {
  async.series ({
    stats: cb => q.stats(cb),
    tsize: cb => q.totalSize(cb)
  }, cb);
}

function pop (q, stage, cb) {
  q.pop('c1', { reserve: true }, (err, res) => {
    stage.obj = res;
    cb(err);
  });
}

function reject (q, stage, cb) {
  var next_t = new Date().getTime() + 2000;

  q.ko (stage.obj, next_t, (err, res) => {
    if (err) return cb (err);
    cb();
  });
}

function accept (q, stage, cb) {
  q.ok (stage.obj, (err, res) => {
    if (err) return cb (err);
    cb();
  });
}

function get_mq_factory (MQ, opts, cb) {
  const common_opts = {
    url: 'mongodb://localhost/keuss_test_backends_deadletter',
    signaller: { provider: LocalSignal},
    stats: {provider: MemStats},
    deadletter: {
    }
  };

  // initialize factory
  MQ (_.merge ({}, common_opts, opts), cb);
}

function release_mq_factory (q, factory, cb) {
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
  {label: 'Stream MongoDB',     mq: require ('../backends/stream-mongo')},
  {label: 'Redis OrderedQueue', mq: require ('../backends/redis-oq')},
  {label: 'MongoDB SafeBucket', mq: require ('../backends/bucket-mongo-safe')},
  {label: 'Mongo IntraOrder',   mq: require ('../backends/intraorder')},
  {label: 'Postgres',           mq: require ('../backends/postgres')},
].forEach(MQ_item => {
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  describe('rollback and deadletters with ' + MQ_item.label + ' queue backend', () => {
    const MQ = MQ_item.mq;

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    beforeEach (done => {
      done();
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    afterEach (done => async.series ([
      cb => setTimeout (cb, 1000),
      cb => MongoClient.connect ('mongodb://localhost/keuss_test_backends_deadletter', (err, cl) => {
        if (err) return done (err);
        cl.db().dropDatabase (() => cl.close (cb))
      })
    ], done));


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('repeated ko causes item to be moved to deadletter if deadletter is set', done => {
      const factory_opts = {
        deadletter: {
          max_ko: 3
        }
      };

      const pl = {
        elem: 1,
        pl: 'twetrwte'
      };

      const hdrs = {aaa: 'qw', bbb: '666'};

      async.waterfall ([
        cb => get_mq_factory (MQ, factory_opts, cb),
        (factory, cb) => {
          const q = factory.queue('test_queue_deadletter', (err, q) => cb (err, q, factory))
        },
        (q, factory, cb) => {
          const stage = {};
          let tries= 0;

          async.race ([
            cb => async.series([
              cb => q.push (pl, {hdrs}, cb),
              cb => pop (q, stage, cb),
              cb => reject (q, stage, (err) => {tries++;cb()}),
              cb => pop (q, stage, cb),
              cb => reject (q, stage,  (err) => {tries++;cb()}),
              cb => pop (q, stage, cb),
              cb => reject (q, stage,  (err) => {tries++;cb()}),
              cb => pop (q, stage, cb),
              cb => reject (q, stage,  (err) => {tries++;cb()}),
              cb => pop (q, stage, cb),
              cb => reject (q, stage,  (err) => {tries++;cb()}),
              cb => pop (q, stage, cb),
              cb => reject (q, stage,  (err) => {tries++;cb()}),
            ], err => {
              err.should.equal ('cancel');
              cb ();
            }),
            cb => factory.deadletter_queue().pop('c2', (err, res) => {
              res.payload.should.eql (pl);
              res.hdrs.should.match ({
                aaa: "qw",
                bbb: "666",
                'x-dl-from-queue': "test_queue_deadletter",
                'x-dl-t': /.+/,
                'x-dl-tries': 4
              });
              tries.should.equal (5);
              cb (err);
            })
          ], err => cb (err, q, factory));
        },
        (q, factory, cb) => {
          async.series ([
            cb => setTimeout (cb, 1000),
            cb => stats (q, cb),
            cb => stats (factory.deadletter_queue(), cb),
          ], (err, res) => {
              res[1].tsize.should.equal (0);
              res[2].tsize.should.equal (0);

            cb (err, q, factory);
          });
        },
        (q, factory, cb) => release_mq_factory (q, factory, cb)
      ], done);
    });


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    it('repeated ko causes item NOT to be moved to deadletter if deadletter is not set', done => {
      const factory_opts = {};

      const pl = {
        elem: 1,
        pl: 'twetrwte'
      };

      async.waterfall ([
        cb => get_mq_factory (MQ, factory_opts, cb),
        (factory, cb) => {
          const q = factory.queue('test_queue_deadletter', (err, q) => cb (err, q, factory))
        },
        (q, factory, cb) => {
          const stage = {};

          async.series([
            cb => q.push (pl, cb),
            cb => pop (q, stage, cb),
            cb => reject (q, stage, cb),
            cb => pop (q, stage, cb),
            cb => reject (q, stage, cb),
            cb => pop (q, stage, cb),
            cb => reject (q, stage, cb),
            cb => pop (q, stage, cb),
            cb => reject (q, stage, cb),
            cb => pop (q, stage, cb),
            cb => reject (q, stage, cb),
            cb => pop (q, stage, cb),
            cb => accept (q, stage, cb)
          ], err => {
            cb (err, q, factory)
          });
        },
        (q, factory, cb) => {
          async.series ([
            cb => setTimeout (cb, 1000),
            cb => stats (q, cb),
            cb => stats (factory.deadletter_queue(), cb),
          ], (err, res) => {
              res[1].tsize.should.equal (0);
              res[2].tsize.should.equal (0);

            cb (err, q, factory);
          });
        },
        (q, factory, cb) => release_mq_factory (q, factory, cb)
      ], done);
    });



  });
});
