/*
 * 
 * very simple example of push-reserve-rollback-reserve-commit: one element is pushed,
 * then reserved, then rolled back (that is, rejected ad back to queue with a delay)
 * Then, it is reserved again and then, finally, committed (and removed fro the queue)
 * 
 */

const async = require ('async');
const MQ =    require ('../../backends/mongo');

// initialize factory
MQ ({
  url: 'mongodb://localhost/keuss_test'
}, (err, factory) => {
  if (err) return console.error(err);

  // factory ready, create one queue
  factory.queue ('test_queue', (err, q) => {
    if (err) return console.error(err);

    async.waterfall ([
    // element is pushed to queue
      cb => q.push ({elem: 1, headline: 'something something', tags: {a: 1, b: 2}}, cb),  
    // element is reserved...
      (item_id, cb) => q.pop ('consumer-1', {reserve: true}, cb),                         
    // ... and rejected back to queue with a delay of 1.5 sec
      (item, cb) => {
        console.log ('%s: got %o', new Date().toString (), item);                        
        const next_t = new Date().getTime () + 1500;
        q.ko (item, next_t, cb);                                                        
      },
    // Element is reserved gain. It will not finish until 1.5 secs have passed
      (ko_res, cb) => q.pop ('consumer-1', {reserve: true}, cb),              
    // and finally, it is committed
      (item, cb) => {
        console.log ('%s: got %o', new Date().toString (), item);                     
        q.ok (item, cb);                                                             
      },
    ], (err, res) => {
      if (err) console.error (err);
      factory.close ();
    });
  });
});

