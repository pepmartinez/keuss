var MQ = require    ('../../../backends/pl-mongo');
var PDL = require   ('../../../Pipeline/DirectLink');
var async = require ('async');

var factory_opts = {
  url: 'mongodb://localhost/qeus'
};

// initialize factory
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);

  function dl_process (elem, done) {
    // pass element to next queue, set payload.passed to true
    done (null, {
      update: {
        $set: {passed: true}
      }
    });
  }

  var q_opts = {};

  factory.builder ()
  .pipeline ('a_test_etcher')
  .queue ('test_pl_1', q_opts)
  .queue ('test_pl_2', q_opts)
  .directLink ('test_pl_1', 'test_pl_2', dl_process)
  .done ((err, pl) => {
    if (err) return console.error (err);
    pl.start ();
    console.log (pl._to_yaml());
  })

/*
  // factory ready, create 2 queues on default pipeline
  var q_opts = {};
  var q1 = factory.queue ('test_pl_1', q_opts);
  var q2 = factory.queue ('test_pl_2', q_opts);

  // tie them up, q1 -> q2
  var pdl = new PDL (q1, q2);

  pdl.start (function (elem, done) {
    // pass element to next queue, set payload.passed to true
    done (null, {
      update: {
        $set: {passed: true}
      }
    });
  });

  console.log (q1.pipeline()._to_yaml());
  */
});
