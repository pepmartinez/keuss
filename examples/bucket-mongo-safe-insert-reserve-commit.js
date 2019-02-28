var MQ = require('../backends/bucket-mongo-safe');

var async = require('async');

var factory_opts = {
  url: 'mongodb://localhost/qeus'
};

// initialize factory 
MQ(factory_opts, (err, factory) => {
  if (err) {
    return console.error(err);
  }

  // factory ready, create one queue
  var q_opts = {};
  var q = factory.queue('test_queue_rcr', q_opts);

  var id = null;

  async.series([
    (cb) => q.push({ elem: 1, pl: 'twetrwte' }, (err, res) => {
        console.log('pushed element');
        cb(err);
    }),
    (cb) => setTimeout (cb, 1000),
    (cb) => q.stats ((err, res) => {
        console.log('queue stats now: %j', res);
        cb(err);
    }),
   (cb) => q.pop ('c1', {reserve: true}, (err, res) => {
        id = res._id;
        console.log('reserved element %j, id is %s', res, id)
        cb(err);
    }),

    /*
    (cb) => q.stats ((err, res) => {
        console.log('queue stats now: %j', res);
        cb(err);
    }),

    
    function (cb) {
      q.ko(id, function (err, res) {
        console.log('rolled back element %s', id);
        cb();
      })
    },
    function (cb) {
      q.stats(function (err, res) {
        console.log('queue stats now: %j', res);
        cb(err);
      })
    },
    function (cb) {
      q.pop('c1', { reserve: true }, function (err, res) {
        id = res._id;
        console.log('reserved element %j', res)
        cb(err);
      });
    },
    function (cb) {
      q.stats(function (err, res) {
        console.log('queue stats now: %j', res);
        cb(err);
      })
    },
*/

    (cb) => q.ok (id, (err, res) => {
      console.log('commited element %s', id);
      cb();
    }),
    (cb) => q.stats ((err, res) => {
      console.log('queue stats now: %j', res);
      cb(err);
    }),
    (cb) => setTimeout (cb, 1000),
    (cb) => q.drain (cb),
    (cb) => {factory.close(); cb ();},
  ], (err) => {
    // all done
    if (err) console.log ('error: ', err)
  });
});