const App =      require ('./app');
const consumer = require ('./consumer');

const listen_port = 6677;

// use simple mongodb backend, mongo stats, mongo signal
var MQ =                  require ('../../backends/mongo');
var signal_mongo_capped = require ('../../signal/mongo-capped');
var stats_mongo =         require ('../../stats/mongo');


var factory_opts = {
  url: 'mongodb://localhost/keuss_webhooks',
  signaller: {
    provider: signal_mongo_capped,
    opts: {
      url: 'mongodb://localhost/keuss_webhooks_signal',
      channel: 'webhooks_channel'
    }
  },
  stats: {
    provider: stats_mongo,
    opts: {
      url: 'mongodb://localhost/keuss_webhooks_stats'
    }
  },
  deadletter: {
    max_ko: 13
  }
};

// initialize factory
MQ (factory_opts, (err, factory) => {
  if (err) return console.error (err);

  console.log ('keuss initialized');

  // factory ready, create queue
  const q = factory.queue ('webhook_default_queue', {});

  //  create context and express app
  let context = {factory, q};
  context.app = App (context);

  // listen for calls
  context.app.listen (listen_port, err => {
    if (err) return console.error (err);
    console.log ('app listening at %s', listen_port);

    // all set, read from queue
    consumer (context);
  });
});


