const async = require ('async');
const MQ =    require ('../backends/intraorder');

// initialize factory
MQ ({
  url: 'mongodb://localhost/keuss'
}, (err, factory) => {
  if (err) return console.error(err);

  const q = factory.queue ('test_queue', {});

  async.waterfall ([
    cb =>            q.push ({iid: 123, elem: 1, headline: 'something something', tags: {a: 1, b: 2}}, cb),  
    (item_id, cb) => q.push ({iid: 123, elem: 2, headline: 'other other', tags: {a: 3, b: 4}}, cb),  
    (item_id, cb) => q.pop ('consumer-1', {reserve: true}, cb), 
    (item, cb) =>    q.ko (item, new Date().getTime () + 1500, cb), 
    (item_id, cb) => q.pop ('consumer-1', {reserve: true}, cb), 
    (item, cb) =>    {console.log ('%s: got %o', new Date().toString (), item.payload); q.ok (item, cb); },
    (item_id, cb) => q.pop ('consumer-1', {reserve: true}, cb), 
    (item, cb) =>    q.ko (item, new Date().getTime () + 1500, cb), 
    (item_id, cb) => q.pop ('consumer-1', {reserve: true}, cb), 
    (item, cb) =>    {console.log ('%s: got %o', new Date().toString (), item.payload); q.ok (item, cb); },
    (i, cb) =>       setTimeout (cb, 100)
  ], (err, res) => {
    if (err) console.error (err);
    factory.close ();
  });
});

