'use strict';

var mubsub = require('mubsub');
var _ =      require('lodash');

var Signal = require ('../Signal');

class MCSignal extends Signal {
  constructor (queue, factory, opts) {
    super (queue, opts);
    this._factory = factory;
    
    this._topic_name = 'keuss:signal:' + queue.ns () + ':' + queue.name ();
    this._opts = opts || {};
    var self = this;
    
    this._factory._channel.subscribe (this._topic_name, function (message) {
      var mature = parseInt (message);
      
//      console.log ('got mongo-capped pubsub event on topic [%s], message is %s, calling master.emitInsertion(%d)', self._topic_name, message, mature);
      self._master.signalInsertion (new Date (mature));
    });

//    console.log ('created mongo-capped signaller for topic %s with opts %j', this._topic_name, opts);
  }
    
  type () {return MCSignalFactory.Type ()}
  
  emitInsertion (mature, cb) { 
//    console.log ('emit mongo-capped pubsub on topic [%s] mature %d)', this._topic_name, mature);
    this._factory._channel.publish (this._topic_name, mature.getTime());
  }
}

class MCSignalFactory {
  constructor (opts) {
    var defaults = {
      url: 'mongodb://localhost:27017/keuss_signal',
      channel: 'default'
    };

    this._opts = {};
    _.merge (this._opts, defaults, opts || {});
    
    this._mubsub = mubsub (this._opts.url, this._opts.mongo_opts);
    this._channel =  this._mubsub.channel (this._opts.channel, this._opts.channel_opts); 

//    console.log ('created mongo-capped factory with opts %j', opts)
  }

  static Type () {return 'signal:mongo-capped'}
  type () {return Type ()}

  signal (channel, opts) {
    return new MCSignal (channel, this, opts);
  }

  close () {
    this._mubsub.close ();
  }
}


function creator (opts, cb) {
  return cb (null, new MCSignalFactory (opts));
}

module.exports = creator;



