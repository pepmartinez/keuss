const async = require ('async');
const MQ =    require ('../backends/intraorder');

// initialize factory
MQ ({
  url: 'mongodb://localhost/keuss'
}, (err, factory) => {
  if (err) return console.error(err);

  factory.queue ('test_queue', (err, q) => {
    if (err) return console.error(err);
/*
    async.waterfall ([
      cb =>            q.push ({iid: 123, elem: 1, headline: 'something something', tags: {a: 1, b: 2}}, cb),  
      (item_id, cb) => q.push ({iid: 123, elem: 2, headline: 'other other', tags: {a: 3, b: 4}}, cb),  
      (item_id, cb) => q.pop ('consumer-1', {reserve: true}, cb), 
      (item, cb) =>    q.ko (item, new Date().getTime () + 1500, cb), 
      (item_id, cb) => q.pop ('consumer-1', {reserve: true}, cb), 
      (item, cb) =>    {console.log ('%s: got %o', new Date().toISOString (), item.payload); q.ok (item, cb); },
      (item_id, cb) => q.pop ('consumer-1', {reserve: true}, cb), 
      (item, cb) =>    q.ko (item, new Date().getTime () + 1500, cb), 
      (item_id, cb) => q.pop ('consumer-1', {reserve: true}, cb), 
      (item, cb) =>    {console.log ('%s: got %o', new Date().toISOString (), item.payload); q.ok (item, cb); },
      (i, cb) =>       setTimeout (cb, 100),
      cb =>            q.status (cb),
    ], (err, res) => {
      if (err) console.error (err);
      console.log (res)
      factory.close ();
    });
*/

    async.series ([
      cb => q.status (cb),
      cb => q.push ({iid: 123, elem: 1, headline: 'something something', tags: {a: 1, b: 2}}, cb), 
      cb => q.status (cb), 
      cb => q.push ({iid: 123, elem: 2, headline: 'other other', tags: {a: 3, b: 4}}, cb),  
      cb => q.status (cb),
      cb => q.pop ('consumer-1', cb), 
      cb => q.status (cb),
      cb => q.pop ('consumer-1', cb), 
      cb => q.status (cb),
      cb => setTimeout (cb, 100),
      cb => q.status (cb),
    ], (err, res) => {
      if (err) console.error (err);
      factory.close ();
      res.forEach ((v, i) => console.log ('%d:', i, v ));
    });
  });
});

