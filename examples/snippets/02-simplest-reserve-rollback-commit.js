const async = require ('async');
const MQ =    require ('keuss/backends/mongo');

MQ ({
  url: 'mongodb://localhost/keuss_test'
}, (err, factory) => {
  if (err) return console.error(err);

  const q = factory.queue ('test_queue', {});

  async.waterfall ([
    cb => q.push ({elem: 1, headline: 'something something', tags: {a: 1, b: 2}}, cb),  
    (item_id, cb) => q.pop ('consumer-1', {reserve: true}, cb),                         
    (item, cb) => {
      console.log ('%s: got %o', new Date().toString (), item);                        
      const next_t = new Date().getTime () + 1500;
      q.ko (item, next_t, cb);                                                        
    },
    (ko_res, cb) => q.pop ('consumer-1', {reserve: true}, cb),                       
    (item, cb) => {
      console.log ('%s: got %o', new Date().toString (), item);                     
      q.ok (item, cb);                                                             
    },
  ], (err, res) => {
    if (err) console.error (err);
    factory.close ();
  });
});

