/*
 *
 * very simple example of stream-mongo: one element pushed, consumed three times
 *
 */
const async = require ('async');
const _ =     require ('lodash');
const MQ =    require ('../backends/stream-mongo');

const group_cardinality = 3;
const mesgs = 1000000;

const stats = {
  consumer: {
    last: 0,
    total: 0
  },
  producer: {
    last: 0,
    total: 0
  }
}

function do_times (cnt, fn, done) {
  if (!cnt) {
    console.log ('loop done')
    return done(null, 0);
  }

  fn (cnt, err => {
    if (err) return done (err, cnt);
    do_times (cnt-1, fn, done);
  })
}

function payload (n) {
  return {elem: n, headline: 'something something', tags: {a: n, b: 2*n}}
}

function headers (n) {
  return {cnt: n, h1: 'something something', h2: false}
}

function producer_looper (q, id) {
  console.log (`creating producer looper ${id}`);
  return (n, cb) => {
    q.push (payload (n), {hdrs: headers(n)}, err => {
//    console.log ('[%s] push #%d', id, n);
      stats.producer.total++;
      cb (err);
    });
  }
}

function consumer_looper (q, id) {
  console.log (`creating consumer looper ${id}`);
  return (n, cb) => {
    q.pop (id, err => {
//    console.log ('[%s] pop #%d', id, n);
      stats.consumer.total++
      cb (err);
    });
  }
}

// initialize factory
MQ ({
  url: 'mongodb://localhost/keuss_test_stream'
}, (err, factory) => {
  if (err) return console.error(err);

  const groups = _.range (1, group_cardinality + 1).map (i => `G${i}`).join (',');
  console.log('groups: ', groups);

  // create queues and clients
  const queue_ctors = {};

  queue_ctors['qp'] =  cb => factory.queue ('test_stream', {groups}, cb);

  for (let i = 1; i <= group_cardinality; i++) {
    queue_ctors[`qc${i}`] = cb => factory.queue ('test_stream', {group: `G${i}`}, cb);
  }

  async.parallel (queue_ctors, (err, queues) => {
    if (err) return console.error(err);
    console.log (`created queues (one producer, ${group_cardinality} consumers)`);

    // create tasks
    const tasks = [];
    tasks.push (cb => do_times (mesgs, producer_looper (queues['qp'], 'p0'),  cb));

    for (let t = 1; t <= group_cardinality; t++) {
      tasks.push (cb => do_times (mesgs, consumer_looper (queues[`qc${t}`], `c${t}`), cb),)
    }

    console.log (`created tasks (one producer, ${group_cardinality} consumers)`);

    async.parallel (tasks, err => {
      factory.close ();
      if (err) console.error (err);
      console.log ('done');
    });

    setInterval (() => {
      console.log (`produced ${stats.producer.total - stats.producer.last} msg/s, consumed ${stats.consumer.total - stats.consumer.last} msg/s`);
      stats.producer.last = stats.producer.total;
      stats.consumer.last = stats.consumer.total
    }, 1000);
  });
});

