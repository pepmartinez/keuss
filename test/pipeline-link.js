
var async =   require ('async');
var should =  require ('should');

var PLL = require ('../PipelineLink');

var factory = null;

[
  {label: 'Pipelined MongoDB',  mq: require ('../backends/pl-mongo')}
].forEach (function (MQ_item) {
  describe ('PipelineLink operations over ' + MQ_item.label, function () {
    var MQ = MQ_item.mq;

    before (function (done) {
      var opts = {};
    
      MQ (opts, function (err, fct) {
        if (err) return done (err);
        factory = fct;
        done();
      });
    });
  
    after (function (done) {
      factory.close (function (err) {
        done (err)
      });
    });
  
    it ('3-elem pipeline flows begin to end', function (done){
      var q_opts = {};
      var q1 = factory.queue ('test_1_pl_1', q_opts);
      var q2 = factory.queue ('test_1_pl_2', q_opts);
      var q3 = factory.queue ('test_1_pl_3', q_opts);
    
      // tie them up, q1 -> q2 -> q3
      var pll1 = new PLL (q1, q2);
      var pll2 = new PLL (q2, q3);

      pll1.start (function (elem, done0) {
        var pl = elem.payload;
        pl.pll1 = 'done';
        done0();
      });

      pll2.start (function (elem, done0) {
        var pl = elem.payload;
        pl.pll2 = 'done';
        done0();
      });

      var pop_opts = {};
      q3.pop ('c', pop_opts, function (err, res) {
        if (err) {
          return done (err);
        }

//        console.log ('got this: ', res);
        pll1.stop();
        pll2.stop ();

        res.payload.should.eql ({ a: 5, b: 'see it run...', pll1: 'done', pll2: 'done' });
        res.tries.should.equal (0);
        res._q.should.equal ('test_1_pl_3');
      
        done ();
      });

      q1.push ({a:5, b:'see it run...'}, {}, function () {});
    });


    it ('3-elem pipeline flows begin to end with retries and various elements', function (done){
      var q_opts = {};
      var q1 = factory.queue ('test_2_pl_1', q_opts);
      var q2 = factory.queue ('test_2_pl_2', q_opts);
      var q3 = factory.queue ('test_2_pl_3', q_opts);
    
      // tie them up, q1 -> q2 -> q3
      var pll1 = new PLL (q1, q2);
      var pll2 = new PLL (q2, q3);

      pll1.start (function (elem, done0) {
        console.log ('pll1: passing %j', elem);
        var pl = elem.payload;
        pl.pll1++;

        if ((pl.a == 3) && (elem.tries < 3))
          done0 ({e: 'error, retry'})
        else 
          done0();
      });

      pll2.start (function (elem, done0) {
        console.log ('pll2: passing %j', elem);
        var pl = elem.payload;
        pl.pll2++;
        
        if ((pl.a == 1) && (elem.tries < 3))
          done0 ({e: 'error, retry'})
        else 
           done0();
      });

      var pop_opts = {};

      async.timesLimit (5, 1, function (n, next) {
        q3.pop ('c', pop_opts, function (err, res) {

          console.log ('--- intermediate got this: %j', res);
          next (err, res);
        })
      }, function (err, res) {

        console.log ('final got this: ', res);
        pll1.stop();
        pll2.stop ();
  
        done ();
      });

      async.timesLimit (5, 1, function (n, next) {
        console.log ('*** pushed elem')
        q1.push ({a:n, b:'see it run...', pll1: 0, pll2: 0}, {}, function () {
          setTimeout (next, 200)
        });
      });
    });

    
  });
});
