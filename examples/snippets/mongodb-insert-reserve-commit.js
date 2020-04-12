// mongodb: create a consumer and a producer
var MQ = require('../backends/mongo');
var async = require('async');

var factory_opts = {
  url: 'mongodb://localhost/qeus'
};

// initialize factory 
MQ(factory_opts, function (err, factory) {
  if (err) {
    return console.error(err);
  }

  // factory ready, create one queue
  var q_opts = {};
  var q = factory.queue('test_queue_rcr', q_opts);

  var id = null;

  async.series([
    function (cb) {
      q.push({ elem: 1, pl: 'twetrwte' }, function (err, res) {
        console.log('pushed element');
        cb(err);
      });
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
    function (cb) {
      q.ok(id, function (err, res) {
        console.log('commited element %s', id);
        cb();
      })
    },
    function (cb) {
      q.stats(function (err, res) {
        console.log('queue stats now: %j', res);
        cb(err);
      })
    }
  ], function (err, results) {
    // all done
    if (err) console.log ('error: ', err)
  });
});