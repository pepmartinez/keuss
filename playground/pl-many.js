// mongodb: create a consumer and a producer
var MQ =    require ('../backends/pl-mongo');
var DCT =   require ('../Pipeline/DirectLink');
var SNK =   require ('../Pipeline/Sink');
var CHC =   require ('../Pipeline/ChoiceLink');
var async = require ('async');
var Chance = require ('chance');

var chance = new Chance();


var factory_opts = {
  url: 'mongodb://localhost/qeus-pl'
};

// initialize factory
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);

  // factory ready, create queues on default pipeline
  var q_opts = {};
  var q1 = factory.queue ('pl_many_q_1', q_opts);
  var q2 = factory.queue ('pl_many_q_2', q_opts);
  var q3 = factory.queue ('pl_many_q_3', q_opts);
  var q4 = factory.queue ('pl_many_q_4', q_opts);
  var q5 = factory.queue ('pl_many_q_5', q_opts);

  // tie them up:
  var dl1 = new DCT (q1, q2);
  var cl1 = new CHC (q2, [q3, q4, q5]);
  var sk1 = new SNK (q3);
  var sk2 = new SNK (q4);
  var sk3 = new SNK (q5);

  function sink_process (elem, done) {
    console.log ('%s: sunk elem [a %d, choice %d]', this.name(), elem.payload.a, elem.payload.choice);
    done();
  }

  sk1.start (sink_process);
  sk2.start (sink_process);
  sk3.start (sink_process);

  cl1.start (function (elem, done) {
    const idx = chance.pickone([0, 1, 2]);
//    console.log ('%s: passing elem %o to %d', this.name(), elem.payload, idx);
    done (null, {
      dst: idx,
      update: {
        $set: {stamp_1: 'passed', choice: idx}
      }
    });
  });

  dl1.start (function (elem, done) {
//    console.log ('%s: passing elem %o', this.name(), elem.payload);
    done (null, {
      update: {
        $set: {stamp_0: 'passed'}
      }
    });
  });



  function loop (n, fn, cb) {
    if (n == 0) return cb ();
    fn (n, err => {
      if (err) return cb (err);
      setImmediate (() => loop (n-1, fn, cb));
    });
  }

  loop (
    10000,
    (n, next) => setTimeout (() => q1.push ({a:n, b:'see it fail...'}, next), chance.integer ({min:0, max: 20})),
    err => console.log (err || 'done')
  );
});
