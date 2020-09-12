const Chance = require ('chance');
const chance = new Chance();

const MQ = require ('../../../backends/pl-mongo');

function loop (n, fn, cb) {
  if (n == 0) return cb ();
  fn (n, err => {
    if (err) return cb (err);
    setImmediate (() => loop (n-1, fn, cb));
  });
}

const factory_opts = {
  url: 'mongodb://localhost/qeus'
};

function get_a_delay (min, max) {
  return chance.integer ({min, max});
}

const num_elems = 37;
let   processed = 0;

function sink_process (elem, done) {
  setTimeout (() => {
    console.log ('%s: sunk elem [a %d, choice %d, tries %d]', this.name(), elem.payload.a, elem.payload.choice, elem.payload.choice_try);
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

function dl_process (elem, done) {
  // pass element to next queue, set payload.passed to true
  done (null, {
    update: {
      $set: {stamp_0: 'passed'}
    }
  });
}

function choice_process (elem, done) {
  setTimeout (() => {
    if (chance.bool ({likelihood: 9})) {
      console.log ('%s: failing on elem %o on try [%d]', this.name(), elem.payload, elem.tries);
      return done ({e: 'cl1 induced a failure'});
    }

    const idx = chance.pickone([0, 1, 2]);
    console.log ('%s: passing elem %o to %d on try [%d]', this.name(), elem.payload, idx, elem.tries);
    done (null, {
      dst: idx,
      update: {
        $set: {stamp_1: 'passed', choice: idx, choice_try: elem.tries}
      }
    });
  }, get_a_delay (10, 20));
}

// initialize factory
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);

  const q_opts = {};

  factory
  .builder ()
  .pipeline ('the-pipeline')
  .queue ('test_pl_1', q_opts)
  .queue ('test_pl_2', q_opts)
  .queue ('test_pl_3', q_opts)
  .queue ('test_pl_4', q_opts)
  .queue ('test_pl_5', q_opts)
  .directLink ('test_pl_1', 'test_pl_2', dl_process)
  .choiceLink ('test_pl_2', ['test_pl_3', 'test_pl_4', 'test_pl_5'], choice_process)
  .sink ('test_pl_3', sink_process)
  .sink ('test_pl_4', sink_process)
  .sink ('test_pl_5', sink_process)
  .onError (console.log)
  .done ((err, pl) => {
    if (err) return console.error (err);
    console.log ('pipeline IS READY')
    pl.start ();
    console.log ('pipeline IS RUNNING, inserting load')

    loop (
      num_elems,
      (n, next) => setTimeout (() => pl.queues()['test_pl_1'].push ({a:n, b:'see it fail...'}, next), chance.integer ({min:0, max: 20})),
      err => console.log (err || 'done')
    );
  });
});
