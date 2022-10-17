var async =  require ('async');
var should = require ('should');
var _ =      require ('lodash');

var LocalSignal = require ('../signal/local');
var MemStats =    require ('../stats/mem');

const MongoClient = require ('mongodb').MongoClient;


function stats (q, cb) {
  async.series ({
    stats: cb => q.stats(cb),
    tsize: cb => q.totalSize(cb)
  }, (err, res) => {
//    console.log ('stats:', res);
    cb (err, res);
  });
}

function get_mq_factory (MQ, opts, cb) {
  const common_opts = {
    url: 'mongodb://localhost/keuss_test_backends_stream_mongo',
    signaller: { provider: LocalSignal},
    stats: {provider: MemStats},
  };

  // initialize factory
  MQ (_.merge ({}, common_opts, opts), cb);
}

function release_mq_factory (factory, cb) {
//  console.log ('releasing mq factory');

  setTimeout (() => {
    factory.close (cb);
  }, 1000);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
[
  {label: 'Stream MongoDB',  mq: require ('../backends/stream-mongo')},
].forEach (MQ_item => {
  describe('stream operations with ' + MQ_item.label + ' queue backend', () => {
    const MQ = MQ_item.mq;

    beforeEach (done => {
      done();
    });

    afterEach (done => async.series ([
      cb => setTimeout (cb, 1000),
      cb => MongoClient.connect ('mongodb://localhost/keuss_test_backends_stream_mongo', (err, cl) => {
        if (err) return done (err);
        cl.db().dropDatabase (() => cl.close (cb))
      })
    ], done));


    it('pushes one message, reads it on 3 clients', done => {
      const pl = {elem: 1, pl: 'twetrwte'};
      const hdrs = {aaa: 'qw', bbb: '666'};

      async.waterfall ([
        cb => get_mq_factory (MQ, {}, cb),
        (factory, cb) => {
          const q0 = factory.queue('test_queue_1', {groups: '000, 001, 002, 003'});
          const q1 = factory.queue('test_queue_1', {group: '000'});
          const q2 = factory.queue('test_queue_1', {group: '001'});
          const q3 = factory.queue('test_queue_1', {group: '002'});

          async.parallel ([
            cb => setTimeout (() => q0.push (pl, {hdrs}, cb), 1111),
            cb => q1.pop ('c1', cb),
            cb => q2.pop ('c2', cb),
            cb => q3.pop ('c3', cb),
          ], (err, res) => {
            if (err) return done (err);
            res[1].should.eql (res[2]);
            res[2].should.eql (res[3]);
            res[1].payload.should.eql (pl);
            res[1].hdrs.should.eql (hdrs);
            cb (err, factory);
          });
        },
        (factory, cb) => release_mq_factory (factory, cb)
      ], done);
    });


    it('pushes one message, unaware cients do not get it', done => {
      const pl = {elem: 1, pl: 'twetrwte'};
      const hdrs = {aaa: 'qw', bbb: '666'};

      async.waterfall ([
        cb => get_mq_factory (MQ, {}, cb),
        (factory, cb) => {
          const q0 = factory.queue('test_queue_1', {groups: '000, 001, 002, 003'});
          const q1 = factory.queue('test_queue_1', {group: '000'});
          const q2 = factory.queue('test_queue_1', {group: '001'});
          const q3 = factory.queue('test_queue_1', {group: '004'});
          const q4 = factory.queue('test_queue_1', {group: '005'});

          async.parallel ([
            cb => setTimeout (() => q0.push (pl, {hdrs}, cb), 1111),
            cb => q1.pop ('c1', cb),
            cb => q2.pop ('c2', cb),
            cb => q3.pop ('c3', {timeout: 2000}, err => cb (null, err)),
            cb => q4.pop ('c4', {timeout: 2000}, err => cb (null, err)),
          ], (err, res) => {
            if (err) return done (err);
            res[1].should.eql (res[2]);
            res[1].payload.should.eql (pl);
            res[1].hdrs.should.eql (hdrs);
            res[3].timeout.should.be.true;
            res[4].timeout.should.be.true;
            cb (err, factory);
          });
        },
        (factory, cb) => release_mq_factory (factory, cb)
      ], done);
    });

    it('pushes one message, only on of several clients on same group get it', done => {
      const pl = {elem: 1, pl: 'twetrwte'};
      const hdrs = {aaa: 'qw', bbb: '666'};

      async.waterfall ([
        cb => get_mq_factory (MQ, {}, cb),
        (factory, cb) => {
          const q0 = factory.queue('test_queue_1', {groups: '000, 001, 002, 003'});
          const q1 = factory.queue('test_queue_1', {group: '000'});
          const q2 = factory.queue('test_queue_1', {group: '000'});
          const q3 = factory.queue('test_queue_1', {group: '001'});
          const q4 = factory.queue('test_queue_1', {group: '001'});

          async.parallel ([
            cb => setTimeout (() => q0.push (pl, {hdrs}, cb), 1111),
            cb => q1.pop ('c1', {timeout: 2000}, (err, res) => cb (null, res || err)),
            cb => q2.pop ('c2', {timeout: 2000}, (err, res) => cb (null, res || err)),
            cb => q3.pop ('c3', {timeout: 2000}, (err, res) => cb (null, res || err)),
            cb => q4.pop ('c4', {timeout: 2000}, (err, res) => cb (null, res || err)),
          ], (err, res) => {
            if (err) return done (err);

            function __calc__ (ra) {
              const res = {ok:0, ko:0};
              ra.forEach (r => {
                if (r.timeout === true) res.ko++;
                else if (r.payload.elem == 1) res.ok++;
              });
              return res;
            }

            __calc__ ([res[1], res[2]]).should.eql ({ok:1, ko:1});
            __calc__ ([res[3], res[4]]).should.eql ({ok:1, ko:1});
            cb (err, factory);
          });
        },
        (factory, cb) => release_mq_factory (factory, cb)
      ], done);
    });

  });
});
