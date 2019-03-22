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
  reject_delta_base: 2000,
  reject_delta_factor: 2000,
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

var shareds = {};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////
function consume_one (shared_ctx, self_ctx, cb) {
  if (shared_ctx.pop_count > shared_ctx.pop_max) {
    console.log ('pop consumer %s ended', self_ctx.id);
    shared_ctx.q.cancel ();
    return cb ();
  }

  shared_ctx.pop_count ++;
  self_ctx.pop_count ++;

  shared_ctx.q.pop (self_ctx.id, shared_ctx.pop_opts, (err, res) => {
    if (err) return cb (err);
    if ((shared_ctx.pop_count % 100000) == 0) console.log ('%s : consumed #%d elems', self_ctx.id, shared_ctx.pop_count);
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

  shareds.pc = shared_ctx;

  var tasks = [];
  for (var i = 0; i < 7; i++) tasks.push ((cb) => run_a_pop_consumer (shared_ctx, cb));
  async.parallel (tasks, cb);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

var das_pop = 0;
var das_ko = 0;
var das_ok = 0;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
function reserve_and_commit_one (shared_ctx, self_ctx, cb) {
  self_ctx.pop_count ++;

  shared_ctx.q.pop (self_ctx.consumer, shared_ctx.pop_opts, (err, res) => {
    if (err) return cb (err);
    self_ctx.resv_count ++;

    das_pop++;

    if (chance.bool({likelihood: 40})) {
      shared_ctx.q.ok (res._id, (err) => {
        if (err) return cb (err);
        self_ctx.ok_count ++;
        shared_ctx.pop_count ++;
        das_ok++;

        if (shared_ctx.pop_count > shared_ctx.pop_max) {
          console.log ('rcr consumer %s ended', self_ctx.id);
          shared_ctx.q.cancel ();
          return cb ();
        }

//        if ((shared_ctx.pop_count % 100000) == 0) console.log ('%s : consumed #%d elems', self_ctx.id, shared_ctx.pop_count);
        reserve_and_commit_one (shared_ctx, self_ctx, cb);
      });
    }
    else {
      shared_ctx.q.ko (res._id, (err) => {
        if (err) return cb (err);
        self_ctx.ko_count ++;
        das_ko++;

//        if ((shared_ctx.pop_count % 100000) == 0) console.log ('%s : consumed #%d elems', self_ctx.id, shared_ctx.pop_count);
        reserve_and_commit_one (shared_ctx, self_ctx, cb);
      });
    }
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

  shareds.rcrc = shared_ctx;

  var tasks = [];
  for (var i = 0; i < 7; i++) 
    tasks.push ((cb) => run_a_rcr_consumer (shared_ctx, cb));
  
  async.parallel (tasks, cb);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////



//////////////////////////////////////////////////////////////////////////////////////////////////////////////
function produce_one (shared_ctx, self_ctx, cb) {
  if (shared_ctx.push_count > shared_ctx.push_max) {
    console.log ('producer %s ended', self_ctx.id);
    return cb ();
  }
  
  shared_ctx.push_count ++;
  self_ctx.push_count ++;

  shared_ctx.q.push ({a: chance.integer (), b: chance.word (), n: shared_ctx.push_count}, function (err, res) {
    if (err) return console.error (err);
//    if ((shared_ctx.push_count % 100000) == 0) console.log ('%s : produced #%d elems', self_ctx.id, shared_ctx.push_count);
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

  shareds.prod = shared_ctx;

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

  var timer = setInterval (() => {
    console.log ('**** state: %j', _.map (shareds, (v, k) => {return {cnt: v.push_count || v.pop_count, max: v.push_max || v.pop_max }}));
   
    console.log ('das pop %d, ko %d, ok %d', das_pop, das_ko, das_ok);

    q.status ((err ,res) => {
      console.log ('**** status: %j', res);
    });
  }, 2000);

  async.parallel ([
    (cb) => run_producers (q, 10000000, cb),
//    (cb) => run_consumers (q, 250000, cb),
    (cb) => run_rcr_consumers (q, 10000000, cb),
  ], (err) => {
    if (err) {
      console.error (err);
    }
    
    var tot_push = 0;
    var tot_pop = 0;
    var tot_resv = 0;
    var tot_ok = 0;
    var tot_ko = 0;

    console.log ('\nProducers: ');
    _.each (selfs.producers, (v, k) => {console.log ('  %s: pushed %d', v.id, v.push_count), tot_push += v.push_count});
    
    console.log ('\nConsumers: ');
    _.each (selfs.consumers, (v, k) => {
      console.log ('  %s: popped %d, resvd %d, committed %d, rollbacked %d', v.id, v.pop_count, v.resv_count, v.ok_count, v.ko_count);
      tot_pop += v.pop_count;
      tot_resv += v.resv_count;
      tot_ok += v.ok_count;
      tot_ko += v.ko_count;
    });
    
    console.log ('  \nTotals: %d popped, %d pushed, resvd %d, committed %d, rollbacked %d', tot_pop, tot_push, tot_resv, tot_ok, tot_ko);
    clearInterval (timer);
    
    q.status ((err ,res) => {
      console.log ('**** status: %j', res);
      q.drain (() => factory.close ());
    });
  });
});
