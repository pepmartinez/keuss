// create a simple producer on top of redis-list
var MQ = require ('../backends/redis-list');

var factory_opts = {};
    
// initialize factory 
MQ (factory_opts, function (err, factory) {
  if (err) {
    return console.err (err);
  }

  // factory ready, create one queue
  var q_opts = {};
  var q = factory.queue ('test_queue', q_opts);

  // insert element
  q.push ({a:1, b:'666'}, function (err, res) {
    if (err) {
      return console.err (err);
    }

    // element inserted at this point. pop it again
    var pop_opts = {};
    q.pop ('consumer-one', pop_opts, function (err, res) {
      if (err) {
        return console.err (err);
      }

      console.log ('got this: ', res.payload);
    });
  });
});