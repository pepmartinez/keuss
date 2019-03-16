var MQ =                  require ('../backends/bucket-mongo-safe');
var signal_mongo_capped = require ('../signal/mongo-capped');
var stats_mongo =         require ('../stats/mongo');

var _ =      require ('lodash');
var async =  require ('async');
var Chance = require ('chance');
var chance = new Chance();


var factory_opts = {
  url: 'mongodb://localhost/qeus',
  name: 'Random-NS',
  signaller: {
    provider: signal_mongo_capped,
    opts: {
      url: 'mongodb://localhost/qeus_signal',
      channel: 'a_channel'
    }
  },
  stats: {
    provider: stats_mongo,
    opts: {
      url: 'mongodb://localhost/qeus_stats'
    }
  }
};


var selfs = {
  consumers: {},
  producers: {}
};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////
function consume_one (shared_ctx, self_ctx, cb) {
  if (shared_ctx.pop_count > shared_ctx.pop_max) return cb ();
  shared_ctx.pop_count ++;
  self_ctx.pop_count ++;

  shared_ctx.q.pop (self_ctx.id, shared_ctx.pop_opts, (err, res) => {
    if (err) return cb (err);
    if ((shared_ctx.pop_count % 10000) == 0) console.log ('%s : consumed #%d elems', self_ctx.id, shared_ctx.pop_count);
    consume_one (shared_ctx, self_ctx, cb);
  });
}


function run_a_pop_consumer (shared_ctx, cb) {
  var self_ctx = {
    id: chance.word (),
    pop_count: 0
  };

  selfs.consumers[self_ctx.id] = self_ctx;

  consume_one (shared_ctx, self_ctx, cb);
}


function run_consumers (q, cnt, cb) {
  var shared_ctx = {
    q: q,
    pop_count: 0,
    pop_max: cnt,
    pop_opts: {}
  };

  var tasks = [];
  for (var i = 0; i < 7; i++) tasks.push ((cb) => run_a_pop_consumer (shared_ctx, cb));
  async.parallel (tasks, cb);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////



//////////////////////////////////////////////////////////////////////////////////////////////////////////////
function reserve_and_commit_one (shared_ctx, self_ctx, cb) {
  if (shared_ctx.pop_count > shared_ctx.pop_max) return cb ();
  shared_ctx.pop_count ++;
  self_ctx.pop_count ++;

  shared_ctx.q.pop (self_ctx.consumer, shared_ctx.pop_opts, (err, res) => {
    if (err) return cb (err);
    self_ctx.resv_count ++;

    shared_ctx.q.ok (res._id, (err) => {
      if (err) return cb (err);
      self_ctx.ok_count ++;
      if ((shared_ctx.pop_count % 10000) == 0) console.log ('%s : consumed #%d elems', self_ctx.id, shared_ctx.pop_count);
      reserve_and_commit_one (shared_ctx, self_ctx, cb);
    });
  });
}


function run_a_rcr_consumer (shared_ctx, cb) {
  var self_ctx = {
    id: chance.word (),
    pop_count: 0,
    resv_count: 0,
    ko_count: 0,
    ok_count: 0
  };

  selfs.consumers[self_ctx.id] = self_ctx;

  reserve_and_commit_one (shared_ctx, self_ctx, cb);
}


function run_rcr_consumers (q, cnt, cb) {
  var shared_ctx = {
    q: q,
    pop_count: 0,
    pop_max: cnt,
    pop_opts: {
      reserve: true
    }
  };

  var tasks = [];
  for (var i = 0; i < 7; i++) tasks.push ((cb) => run_a_rcr_consumer (shared_ctx, cb));
  async.parallel (tasks, cb);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////



//////////////////////////////////////////////////////////////////////////////////////////////////////////////
function produce_one (shared_ctx, self_ctx, cb) {
  if (shared_ctx.push_count > shared_ctx.push_max) return cb ();
  shared_ctx.push_count ++;
  self_ctx.push_count ++;

  shared_ctx.q.push ({a: chance.integer (), b: chance.word (), n: shared_ctx.push_count}, function (err, res) {
    if (err) return console.error (err);
    if ((shared_ctx.push_count % 10000) == 0) console.log ('%s : produced #%d elems', self_ctx.id, shared_ctx.push_count);
    produce_one (shared_ctx, self_ctx, cb);
  });
}


function run_a_producer (shared_ctx, cb) {
  var self_ctx = {
    id: chance.word (),
    push_count: 0
  };

  selfs.producers[self_ctx.id] = self_ctx;

  produce_one (shared_ctx, self_ctx, cb);
}

function run_producers (q, cnt, cb) {
  var shared_ctx = {
    q: q,
    push_count: 0,
    push_max: cnt
  };

  var tasks = [];
  for (var i = 0; i < 3; i++) tasks.push ((cb) => run_a_producer (shared_ctx, cb));
  async.parallel (tasks, cb);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////


// initialize factory 
MQ (factory_opts, function (err, factory) {
  if (err) return console.error (err);

  // factory ready, create one queue
  var q_opts = {};
  var q = factory.queue ('test_queue_456', q_opts);

  async.parallel ([
    (cb) => run_producers (q, 500000, cb),
//    (cb) => setTimeout (() => run_consumers (q, 250000, cb), 1000),
    (cb) => setTimeout (() => run_rcr_consumers (q, 500000, cb), 1000),
  ], (err) => {
    if (err) {
      console.error (err);
    }
    
    var tot_push = 0;
    var tot_pop = 0;
    var tot_resv = 0;
    var tot_ok = 0;

    console.log ('Producers: ');
    _.each (selfs.producers, (v, k) => {console.log ('  %s: popped %d', v.id, v.push_count), tot_push += v.push_count});
    console.log ('Consumers: ');
    _.each (selfs.consumers, (v, k) => {
      console.log ('  %s: pushed %d, resvd %d, committed %d', v.id, v.pop_count, v.resv_count, v.ok_count);
      tot_pop += v.pop_count;
      tot_resv += v.resv_count;
      tot_ok += v.ok_count;
    });
    
    console.log ('Totals: %d popped, %d pushed, resvd %d, committed %d', tot_pop, tot_push, tot_resv, tot_ok);

    q.drain (() => factory.close ());
  });
});
