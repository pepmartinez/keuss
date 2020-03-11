
// var MQ = require('../backends/bucket-mongo-safe');
// var MQ = require('../backends/redis-oq');
var MQ = require('../backends/ps-mongo');

var async = require('async');


function stats (q, cb) {
  q.stats((err, res) => {
    console.log('queue stats now: %j', res);
    cb(err);
  });
}

function pop (q, stage, cb) {
  q.pop('c1', { reserve: true }, (err, res) => {
    stage.obj = res;
    console.log('reserved element %j', res);
    cb(err);
  });
}

function reject (q, stage, cb) {
  var next_t = new Date().getTime() + 2000;

  q.ko (stage.obj, next_t, (err, res) => {
    if (err) {
      console.error ('error in rollback of %s: %j', stage.obj._id, err);
      return cb (err);
    }

    console.log('rolled back element %s: %j', stage.obj._id, res);
    cb();
  });
}

function accept (q, stage, cb) {
  q.ok (stage.obj, (err, res) => {
    if (err) {
      console.error ('error in rollback of %s: %j', stage.obj._id, err);
      return cb (err);
    }

    console.log('commited element %s: %j', stage.obj._id, res);
    cb();
  });
}


var factory_opts = {
  url: 'mongodb://localhost/qeus',
  deadletter: {
    max_ko: 3
  }
};

// initialize factory
MQ(factory_opts, (err, factory) => {
  if (err) return console.error(err);

  // factory ready, create one queue
  var q_opts = {};

  var q = factory.queue('test_queue_rcr', q_opts);

  var stage = {};


  async.series([
    cb => q.push({ elem: 1, pl: 'twetrwte' }, (err, res) => {
      console.log('pushed element');
      cb(err);
    }),
    cb => pop (q, stage, cb),
    cb => reject (q, stage, cb),
    cb => pop (q, stage, cb),
    cb => reject (q, stage, cb),
    cb => pop (q, stage, cb),
    cb => reject (q, stage, cb),
    cb => pop (q, stage, cb),
    cb => reject (q, stage, cb),
    cb => pop (q, stage, cb),
    cb => reject (q, stage, cb),
    cb => pop (q, stage, cb),
    cb => reject (q, stage, cb)
  ], err => {
    // all done
    if (err) console.error ('reject_line error: ', err);
    else console.log ('reject_line done');
  });

  factory.deadletter_queue().pop('c2', (err, res) => {
    console.log('from deadletter_queue, got element %j', res);
    setTimeout (() => {
      q.cancel ();
      factory.close (() => console.log ('done'));
    }, 1000);
  });
});
