// mongodb: create a consumer and a producer, use redis signaller and redis stats
var MQ = require ('../backends/mongo');
var signal_mongo_capped = require ('../signal/mongo-capped');
var stats_mongo = require ('../stats/mongo');


var factory_opts = {
  url: 'mongodb://localhost/qeus',
  signaller: {
    provider: signal_mongo_capped,
    opts: {
      url: 'mongodb://localhost/qeus_signal',
      channel: 'das_channel'
    }
  },
  stats: {
    provider: stats_mongo,
    opts: {
      url: 'mongodb://localhost/qeus_stats'
    }
  }
};

// initialize factory
MQ (factory_opts, function (err, factory) {
  if (err) {
    return console.error (err);
  }

  // factory ready, create one queue
  var q_opts = {};
  var q = factory.queue ('test_queue_456', q_opts);

  // insert element
  q.push ({a:1, b:'666'}, function (err, res) {
    if (err) {
      return console.error (err);
    }

    // element inserted at this point. pop it again
    var pop_opts = {};
    q.pop ('consumer-one', pop_opts, function (err, res) {
      if (err) {
        return console.error (err);
      }

      console.log ('got this: ', res.payload);
    });
  });
});
