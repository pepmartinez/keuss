const Chance = require ('chance');


const chance = new Chance();

const MQ = require    ('../../../backends/pl-mongo');

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


const num_elems = 11;
let   processed = 0;


const src = `
const Chance = require ('chance');
const chance = new Chance();

function get_a_delay (min, max) {
  return chance.integer ({min, max});
}

function sink_process (elem, done) {
//  throw Error ('suck it');
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

function dl_process (elem, done) {
  // pass element to next queue, set payload.passed to true
  done (null, {
    update: {
      $set: {passed: true}
    }
  });
}

const q_opts = {};

builder
  .pipeline ('a_test_etcher')
  .queue ('test_pl_1', q_opts)
  .queue ('test_pl_2', q_opts)
  .directLink ('test_pl_1', 'test_pl_2', dl_process)
  .sink ('test_pl_2', sink_process)
  .done (done);
`


// initialize factory
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);

  factory.pipelineFromRecipe (src, {
    context: {
      num_elems,
      processed
    }
  }, (err, pl) => {
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
