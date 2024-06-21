// mongodb: create a consumer and a producer
const MQ = require ('../backends/pl-mongo');

const factory_opts = {
  url: 'mongodb://localhost/qeus'
};
    
// initialize factory 
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);

  // factory ready, create one queue
  factory.queue ('test_queue', (err, q) => {
    if (err) return console.error (err);

    // insert element
    q.push ({a:1, b:'666'}, {delay: 3}, (err, res) => {
      if (err) return console.error (err);

      // element inserted at this point. pop it again
      const pop_opts = {};
      q.pop ('consumer-one', pop_opts, (err, res) => {
        if (err) return console.error (err);
        console.log ('got this: ', res);
        factory.close()
      });
    });
  });
});
