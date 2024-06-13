/*
 * 
 * Runs a set of producers and consumers, where consumers do a reserve-commit-rollback cycle. In each cycle a 
 * consumer would randomly choose whether to commit or rollback (10% chance of rollback). No deadletter is used
 * so elements are retried ad infinitum until processed ok
 * 
 * Upon completion (all items generated and consumed ok) some stats will be shown
 * 
 * It uses bucket-mongo-safe backend for high throughput
 * 
*/

//const MQ = require ('../../backends/bucket-mongo-safe');
const MQ = require ('../../backends/postgres');

const _ =      require ('lodash');
const async =  require ('async');
const Chance = require ('chance');
const chance = new Chance();


const factory_opts = {
  url: 'mongodb://localhost/qeus',
  name: 'Random-NS',
  reject_delta_base: 2000,
  reject_delta_factor: 2000
};

// test dimensions: elems to produce and consume, number of consumers, number of producers
const num_elems =        1000000;
const num_producers =          9;
const num_pop_consumers =      2;
const num_rcr_consumers =     13;
const commit_likelihood =     37;
const retry_max_delay =     5000;

// stats holder
const selfs = {
  consumers: {},
  producers: {}
};

let push_done = false;
let items_pushed = 0;
let items_popped = 0;
let items_reserved = 0;
let items_rolledback = 0;
let items_commited = 0;
let items_processed = 0;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////
function consume_one (shared_ctx, self_ctx, cb) {
  if ((push_done) && (items_processed >= items_pushed)) {
    console.log ('pop consumer %s ended', self_ctx.id);
    shared_ctx.q.cancel();
    return cb ();
  }

  shared_ctx.q.pop (self_ctx.id, shared_ctx.pop_opts, (err, res) => {
    if (err) return cb (err);

    self_ctx.pop_count++;
    items_popped++;
    items_processed++;
    
    if ((shared_ctx.pop_count % 100000) == 0) console.log ('%s : pop-consumed #%d elems', self_ctx.id, shared_ctx.pop_count);
    consume_one (shared_ctx, self_ctx, cb);
  });
}

function run_a_pop_consumer (shared_ctx, cb) {
  const self_ctx = {
    id: chance.word (),
    pop_count: 0
  };

  selfs.consumers[self_ctx.id] = self_ctx;

  console.log ('pop consumer %s started', self_ctx.id);
  consume_one (shared_ctx, self_ctx, err => {
    console.log (`pop consumer ${self_ctx.id} ended`);
    if (err && (err != 'cancel')) console.log (`Error in pop consumer ${self_ctx.id}`, err);
    cb ();
  });
}

function run_pop_consumers (q, cnt, cb) {
  const shared_ctx = {
    q: q,
    pop_opts: {}
  };

  const tasks = [];
  for (let i = 0; i < num_pop_consumers; i++) tasks.push ((cb) => run_a_pop_consumer (shared_ctx, cb));
  async.parallel (tasks, cb);
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////
function reserve_and_commit_one (shared_ctx, self_ctx, cb) {
  if ((push_done) && (items_processed >= items_pushed)) {
    shared_ctx.q.cancel();
    return cb ();
  }

  shared_ctx.q.pop (self_ctx.id, shared_ctx.pop_opts, (err, res) => {
    if (err) return cb (err);
    self_ctx.resv_count++;
    items_reserved++;

    if (chance.bool({likelihood: commit_likelihood})) {
      shared_ctx.q.ok (res._id, (err) => {
        if (err) return cb (err);

        self_ctx.ok_count++;
        items_commited++;
        items_processed++;

        reserve_and_commit_one (shared_ctx, self_ctx, cb);
      });
    }
    else {
      const retry_delta = chance.integer({ min: 0, max: retry_max_delay });
      const next_t = (new Date().getTime()) + retry_delta;
      shared_ctx.q.ko (res._id, next_t, (err) => {
        if (err) return cb (err);
        self_ctx.ko_count++;
        items_rolledback++;

        reserve_and_commit_one (shared_ctx, self_ctx, cb);
      });
    }
  });
}

function run_a_rcr_consumer (shared_ctx, cb) {
  const self_ctx = {
    id: chance.word (),
    pop_count: 0,
    resv_count: 0,
    ko_count: 0,
    ok_count: 0
  };

  selfs.consumers[self_ctx.id] = self_ctx;

  console.log ('rcr consumer %s started', self_ctx.id);
  reserve_and_commit_one (shared_ctx, self_ctx, err => {
    console.log (`rcr consumer ${self_ctx.id} ended`);
    if (err && (err != 'cancel')) console.log (`Error in rcr consumer ${self_ctx.id}`, err);
    cb ();
  });
}

function run_rcr_consumers (q, cnt, cb) {
  const shared_ctx = {
    q: q,
    pop_opts: {
      reserve: true
    }
  };

  const tasks = [];
  for (let i = 0; i < num_rcr_consumers; i++) 
    tasks.push ((cb) => run_a_rcr_consumer (shared_ctx, cb));
  
  async.parallel (tasks, cb);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////



//////////////////////////////////////////////////////////////////////////////////////////////////////////////
function produce_one (shared_ctx, self_ctx, cb) {
  if (items_pushed >= num_elems) {
    push_done = true;
    console.log ('producer %s ended', self_ctx.id);
    return cb ();
  }

  shared_ctx.q.push ({a: chance.integer (), b: chance.word (), n: shared_ctx.push_count}, (err, res) => {
    if (err) return console.error (err);

    items_pushed++;
    self_ctx.push_count++;
    
    produce_one (shared_ctx, self_ctx, cb);
  });
}

function run_a_producer (shared_ctx, cb) {
  const self_ctx = {
    id: chance.word (),
    push_count: 0
  };

  selfs.producers[self_ctx.id] = self_ctx;

  console.log ('producer %s started', self_ctx.id);
  produce_one (shared_ctx, self_ctx, cb);
}

function run_producers (q, cnt, cb) {
  const shared_ctx = {
    q: q
  };

  const tasks = [];
  for (let i = 0; i < num_producers; i++) tasks.push ((cb) => run_a_producer (shared_ctx, cb));
  async.parallel (tasks, cb);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////


// initialize factory 
MQ (factory_opts, function (err, factory) {
  if (err) return console.error (err);

  // factory ready, create one queue
  const q_opts = {};
  const q = factory.queue ('test_queue_456', q_opts);

  q.init(err => {
    if (err) return console.error (err);

    const timer = setInterval (() => {
      q.status ((err ,res) => {
        console.log ('push %d, pop %d, rsv %d, ko %d, ok %d, processed %d, status: %o', 
          items_pushed, 
          items_popped,
          items_reserved,
          items_rolledback,
          items_commited, 
          items_processed,
          _.pick (res, ['size', 'totalSize', 'resvSize', 'schedSize']));
      });
    }, 1000);

    async.parallel ([
      cb => run_producers     (q, num_elems, cb),
      cb => run_pop_consumers (q, num_elems, cb),
      cb => run_rcr_consumers (q, num_elems, cb),
    ], (err) => {
      if (err) return console.error (err);
    
      let tot_push = 0;
      let tot_pop = 0;
      let tot_resv = 0;
      let tot_ok = 0;
      let tot_ko = 0;

      console.log ('\nProducers: ');
      _.each (selfs.producers, (v, k) => {console.log ('  %s: pushed %d', v.id, v.push_count), tot_push += v.push_count});
    
      console.log ('\nConsumers: ');
      _.each (selfs.consumers, (v, k) => {
        console.log ('  %s: popped %d, resvd %d, committed %d, rollbacked %d', 
          v.id, 
          v.pop_count || 0, 
          v.resv_count || 0, 
          v.ok_count || 0, 
          v.ko_count || 0);

        tot_pop += (v.pop_count || 0);
        tot_resv += (v.resv_count || 0);
        tot_ok += (v.ok_count || 0);
        tot_ko += (v.ko_count || 0);
      });
    
      console.log ('  \nTotals: %d popped, %d pushed, resvd %d, committed %d, rollbacked %d', tot_pop, tot_push, tot_resv, tot_ok, tot_ko);
      clearInterval (timer);
    
      q.status ((err ,res) => {
        console.log ('**** status: %o', _.omit (res, ['type', 'capabilities', 'factory', 'paused']));
        q.drain (() => factory.close ());
      });
    });
  });
});
