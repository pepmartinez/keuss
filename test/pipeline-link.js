
var async =   require ('async');
var should =  require ('should');

var PDL = require ('../Pipeline/DirectLink');

var factory = null;

[
  {label: 'Pipelined MongoDB',  mq: require ('../backends/pl-mongo')}
].forEach (function (MQ_item) {
  describe ('Pipeline/DirectLink operations over ' + MQ_item.label, function () {
    var MQ = MQ_item.mq;

    before (done => {
      var opts = {};

      MQ (opts, (err, fct) => {
        if (err) return done (err);
        factory = fct;
        done();
      });
    });


    after (done => async.series ([
      cb => setTimeout (cb, 1000),
      cb => factory.close (cb)
    ], done));

    it ('3-elem pipeline flows begin to end, no payload changes', done => {
      var q_opts = {};
      var q1 = factory.queue ('test_1_pl_1', q_opts);
      var q2 = factory.queue ('test_1_pl_2', q_opts);
      var q3 = factory.queue ('test_1_pl_3', q_opts);

      // tie them up, q1 -> q2 -> q3
      var pll1 = new PDL (q1, q2);
      var pll2 = new PDL (q2, q3);

      pll1.start ((elem, done0) => {
        done0();
      });

      pll2.start ((elem, done0) => {
        done0();
      });

      var pop_opts = {};

      q3.pop ('c', pop_opts, (err, res) => {
        if (err) return done (err);

        pll1.stop();
        pll2.stop();

        res.payload.should.eql ({ a: 5, b: 'see it run...'});
        res.tries.should.equal (0);
        res._q.should.equal ('test_1_pl_3');

        done ();
      });

      q1.push ({a:5, b:'see it run...'}, {}, () => {});
    });

    it ('3-elem pipeline flows begin to end, full payload overwrite', done => {
      var q_opts = {};
      var q1 = factory.queue ('test_1_pl_1', q_opts);
      var q2 = factory.queue ('test_1_pl_2', q_opts);
      var q3 = factory.queue ('test_1_pl_3', q_opts);

      // tie them up, q1 -> q2 -> q3
      var pll1 = new PDL (q1, q2);
      var pll2 = new PDL (q2, q3);

      pll1.start ((elem, done0) => {
        var pl = elem.payload;
        pl.pll1 = 'done';
        done0(null, {payload: pl});
      });

      pll2.start ((elem, done0) => {
        var pl = elem.payload;
        pl.pll2 = 'done';
        done0(null, {payload: pl});
      });

      var pop_opts = {};

      q3.pop ('c', pop_opts, (err, res) => {
        if (err) return done (err);

        pll1.stop();
        pll2.stop();

        res.payload.should.eql ({ a: 5, b: 'see it run...', pll1: 'done', pll2: 'done' });
        res.tries.should.equal (0);
        res._q.should.equal ('test_1_pl_3');

        done ();
      });

      q1.push ({a:5, b:'see it run...'}, {}, () => {});
    });


    it ('3-elem pipeline flows begin to end, payload update', done => {
      var q_opts = {};
      var q1 = factory.queue ('test_1_pl_1', q_opts);
      var q2 = factory.queue ('test_1_pl_2', q_opts);
      var q3 = factory.queue ('test_1_pl_3', q_opts);

      // tie them up, q1 -> q2 -> q3
      var pll1 = new PDL (q1, q2);
      var pll2 = new PDL (q2, q3);

      pll1.start ((elem, done0) => {
        done0(null, {update: {$set: {pll1: 'done'}}});
      });

      pll2.start ((elem, done0) => {
        done0(null, {update: {$set: {pll2: 'done'}}});
      });

      var pop_opts = {};

      q3.pop ('c', pop_opts, (err, res) => {
        if (err) return done (err);

        pll1.stop();
        pll2.stop();

        res.payload.should.eql ({ a: 5, b: 'see it run...', pll1: 'done', pll2: 'done' });
        res.tries.should.equal (0);
        res._q.should.equal ('test_1_pl_3');

        done ();
      });

      q1.push ({a:5, b:'see it run...'}, {}, () => {});
    });


    it ('3-elem pipeline flows begin to end with retries and various elements', done => {
      var q_opts = {};
      var q1 = factory.queue ('test_2_pl_1', q_opts);
      var q2 = factory.queue ('test_2_pl_2', q_opts);
      var q3 = factory.queue ('test_2_pl_3', q_opts);

      // intermediate state
      var stage1_retries = 0;
      var stage2_retries = 0;

      // tie them up, q1 -> q2 -> q3
      var pll1 = new PDL (q1, q2);
      var pll2 = new PDL (q2, q3);

      pll1.start ((elem, done0) => {
        const pl = elem.payload;
        if ((pl.a == 3) && (elem.tries < 3)) {
          stage1_retries++;
          done0 ({e: 'error, retry'});
        }
        else
          done0(null, {update: {$inc: {pll1: 1}}});
      });

      pll2.start ((elem, done0) => {
        const pl = elem.payload;
        if ((pl.a == 1) && (elem.tries < 3)) {
          stage2_retries++;
          done0 ({e: 'error, retry'});
        }
        else
          done0(null, {update: {$inc: {pll2: 1}}});
      });

      var pop_opts = {};

      async.timesLimit (5, 1, (n, next) => {
        q3.pop ('c', pop_opts, (err, res) => next (err, res));
      }, (err, res) => {
        stage1_retries.should.equal (3);
        stage2_retries.should.equal (3);

        res[0].payload.should.eql ({ a: 0, b: 'see it run...', pll1: 1, pll2: 1 });
        res[0].tries.should.equal (0);
        res[0]._q.should.equal ('test_2_pl_3');

        res[1].payload.should.eql ({ a: 2, b: 'see it run...', pll1: 1, pll2: 1 });
        res[1].tries.should.equal (0);
        res[1]._q.should.equal ('test_2_pl_3');

        res[2].payload.should.eql ({ a: 4, b: 'see it run...', pll1: 1, pll2: 1 });
        res[2].tries.should.equal (0);
        res[2]._q.should.equal ('test_2_pl_3');

        res[3].payload.should.eql ({ a: 1, b: 'see it run...', pll1: 1, pll2: 1 });
        res[3].tries.should.equal (0);
        res[3]._q.should.equal ('test_2_pl_3');

        res[4].payload.should.eql ({ a: 3, b: 'see it run...', pll1: 1, pll2: 1 });
        res[4].tries.should.equal (0);
        res[4]._q.should.equal ('test_2_pl_3');

        pll1.stop();
        pll2.stop ();

        done ();
      });

      async.timesLimit (5, 1, (n, next) =>
        q1.push ({a:n, b:'see it run...', pll1: 0, pll2: 0}, {}, () => setTimeout (next, 200))
      );
    });


  });
});
