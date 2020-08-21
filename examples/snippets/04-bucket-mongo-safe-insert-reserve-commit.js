/*
 * 
 * simple sequence of insert, reserve, rollback and commits over a bucket-mongo-safe queue
 * every now and then queue stats are shown; a delay is added to ensure stats' flow happens
 * 
 */

const async = require('async');
const MQ = require('../../backends/bucket-mongo-safe');

const factory_opts = {
  url: 'mongodb://localhost/qeus',
  reserve_delay: 7
};

// initialize factory 
MQ(factory_opts, (err, factory) => {
  if (err) return console.error(err);

  // factory ready, create one queue
  const q = factory.queue('test_queue_rcr', {});

  let id = null;

  async.series([
    cb => q.push({ elem: 1, pl: 'twetrwte' }, cb),
    cb => q.push({ elem: 2, pl: 'twetrwte' }, cb),
    cb => q.push({ elem: 3, pl: 'twetrwte' }, cb),
    cb => setTimeout (cb, 500),
    cb => q.stats ((err, res) => {
        console.log('queue stats now: %o', res);
        cb(err);
    }),
   cb => q.pop ('c1', {reserve: true}, (err, res) => {
        id = res._id;
        console.log('reserved element %o, id is %s', res, id)
        cb(err);
    }),
    cb => setTimeout (cb, 500),
    cb => q.stats ((err, res) => {
        console.log('queue stats now: %o', res);
        cb(err);
    }),
    cb => q.ko(id, (err, res) => {
      console.log('rolled back element %s -> %s', id, res);
      cb();
    }),
    cb => setTimeout (cb, 500),
    cb => q.stats ((err, res) => {
        console.log('queue stats now: %o', res);
        cb(err);
    }),
    cb => q.pop ('c1', {reserve: true}, (err, res) => {
      id = res._id;
      console.log('reserved element %o, id is %s', res, id)
      cb(err);
    }),
    cb => setTimeout (cb, 500),
    cb => q.stats ((err, res) => {
      console.log('queue stats now: %o', res);
      cb(err);
    }),
    cb => q.ok (id, (err, res) => {
      console.log('commited element %s -> %s', id, res);
      cb();
    }),
    cb => setTimeout (cb, 1000),
    cb => q.stats ((err, res) => {
      console.log('queue stats now: %o', res);
      cb(err);
    }),
    cb => q.drain (cb),
    cb => {factory.close(); cb ();},
  ], err => {
    // all done
    if (err) console.log ('error: ', err)
  });
});
