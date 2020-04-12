// mongodb: create a consumer and a producer
var MQ = require ('../backends/mongo');

var factory_opts = {
  url: 'mongodb://localhost/qeus'
};
    
// initialize factory 
MQ (factory_opts, function (err, factory) {
  if (err) {
    return console.error (err);
  }

  // factory ready, create one queue
  var q_opts = {};
  var q = factory.queue ('test_queue', q_opts);

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