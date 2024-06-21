// mongodb: create a consumer and a producer
const async = require ('async');

const MQ =    require ('../backends/postgres');

const factory_opts = {
  postgres: {
    user: 'pg', 
    password: 'pg',
    host: 'localhost',
    port: 5432,
    database: 'pg'
  }
};
    
// initialize factory 
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);

  // factory ready, create one queue
  const q_opts = {};
  factory.queue ('test_queue', q_opts, (err, q) => {
    if (err) return console.error (err);

    const state = {};

    async.series ([
      cb => q.push ({a:1, b:'666'}, {delay: 2}, cb),
      cb => q.status (cb),
      cb => q.pop ('consumer-one', {reserve: true}, (err, res) => { state.ca = res; cb (err, res)}) ,
      cb => q.status (cb),
      cb => q.ko (state.ca, (new Date().getTime() + 3000), cb),
      cb => q.pop ('consumer-one', {reserve: true}, (err, res) => { state.ca = res; cb (err, res)}) ,
      cb => q.ok (state.ca, cb),
      cb => q.status (cb),
    ], (err, res) => {
      if (err) console.error (err);
      factory.close ();
      res.forEach ((v, i) => console.log ('====> %d:', i, v ));
    });
  });
});
