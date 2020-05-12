// mongodb: create a consumer and a producer
const Chance = require ('chance');

const MQ =     require ('../../../backends/pl-mongo');
const signal = require ('../../../signal/mongo-capped');
const stats =  require ('../../../stats/mongo');
const DCT =    require ('../../../Pipeline/DirectLink');
const SNK =    require ('../../../Pipeline/Sink');
const CHC =    require ('../../../Pipeline/ChoiceLink');


const chance = new Chance();

const num_elems = 1000;
let   processed = 0;


function get_a_delay (min, max) {
  return chance.integer ({min, max});
}

function loop (n, fn, cb) {
  if (n == 0) return cb ();
  fn (n, err => {
    if (err) return cb (err);
    setImmediate (() => loop (n-1, fn, cb));
  });
}

function sink_process (elem, done) {
  setTimeout (() => {
    console.log ('%s: sunk elem [a %d, choice %d]', this.name(), elem.payload.a, elem.payload.choice);
    done();

    processed++;
    if (processed == num_elems) {
      setTimeout (() =>{
        console.log ('processing done, exiting');
        process.exit (0);
      }, 1000);
    }

  }, get_a_delay (10, 20));
}


const factory_opts = {
  url: 'mongodb://localhost/qeus_pl',
  signaller: {
    provider: signal,
    opts: {
      url: 'mongodb://localhost/qeus_pl_signal',
      channel: 'das_channel'
    }
  },
  stats: {
    provider: stats,
    opts: {
      url: 'mongodb://localhost/qeus_pl_stats'
    }
  },
  deadletter: {
    max_ko: 3
  }
};

// initialize factory
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);

  // factory ready, create queues on default pipeline
  const q_opts = {};
  const q1 = factory.queue ('pl_many_q_1', q_opts);
  const q2 = factory.queue ('pl_many_q_2', q_opts);
  const q3 = factory.queue ('pl_many_q_3', q_opts);
  const q4 = factory.queue ('pl_many_q_4', q_opts);
  const q5 = factory.queue ('pl_many_q_5', q_opts);

  // tie them up:
  const dl1 = new DCT (q1, q2);
  const cl1 = new CHC (q2, [q3, q4, q5]);
  const sk1 = new SNK (q3);
  const sk2 = new SNK (q4);
  const sk3 = new SNK (q5);

  sk1.on_data (sink_process);
  sk2.on_data (sink_process);
  sk3.on_data (sink_process);

  cl1.on_data (function (elem, done) {
    setTimeout (() => {
      if (chance.bool ({likelihood: 90})) {
        return done ({e: 'cl1 induced a failure'});
      }

      const idx = chance.pickone([0, 1, 2]);
      console.log ('%s: passing elem %o to %d on try [%d]', this.name(), elem.payload, idx, elem.tries);
      done (null, {
        dst: idx,
        update: {
          $set: {stamp_1: 'passed', choice: idx}
        }
      });
    }, get_a_delay (10, 100));
  });

  dl1.on_data (function (elem, done) {
    setTimeout (() => {
      console.log ('%s: passing elem %o', this.name(), elem.payload);
      done (null, {
        update: {
          $set: {stamp_0: 'passed'}
        }
      });
    }, get_a_delay (10, 100));
  });

  sk1.start ();
  sk2.start ();
  sk3.start ();
  cl1.start ();
  dl1.start ();

  loop (
    num_elems,
    (n, next) => setTimeout (() => q1.push ({a:n, b:'see it fail...'}, next), chance.integer ({min:0, max: 20})),
    err => console.log (err || 'done')
  );
});
