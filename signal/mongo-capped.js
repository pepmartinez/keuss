var mubsub = require('@nodebb/mubsub');
var _ =      require('lodash');

var Signal = require ('../Signal');

var debug = require('debug')('keuss:Signal:MongoCapped');


class MCSignal extends Signal {
  constructor (queue, factory, opts) {
    super (queue, opts);
    this._factory = factory;

    this._topic_name = 'keuss:signal:' + queue.ns () + ':' + queue.name ();
    this._opts = opts || {};

    this._factory._channel.subscribe (this._topic_name, message => {
      // if message is an int already, take it as insertion issue
      if (_.isNumber (message)) return this._insertionEvent (message);

      if (! _.isString (message)) {
        debug ('received non-int, non-string message. Ignoring it...', message);
        return;
      }

      var msg = message.split (' ');
      if (msg.length == 1) return this._insertionEvent (parseInt (message));

      var cmd = msg[0];
      switch (cmd) {
        case 'p': {
          // pause/resume
          var paused = (msg[1] == 'true' ? true : false);
          debug ('got pause event on ch [%s], message is %s, calling master.emitInsertion()', this._channel, message);
          this._master.signalPaused (paused);
        }
        break;

        default: {
          debug ('unknown event [%s] on channel [%s]', message, this._channel);
        }
      }
    });

    debug ('created mongo-capped signaller for topic %s with opts %o', this._topic_name, opts);
  }

  type () {return MCSignalFactory.Type ()}

  emitInsertion (mature, cb) {
    debug ('emit insertion on topic [%s] value [%d])', this._topic_name, mature);
    this._factory._channel.publish (this._topic_name, mature.getTime());
  }

  emitPaused (paused, cb) {
    debug ('emit paused on topic [%s], value [%b]', this._topic_name, paused);
    this._factory._channel.publish (this._topic_name, `p ${paused}`);
  }

  _insertionEvent (mature) {
    debug ('got insertion event on ch [%s], mature is %s, calling master.emitInsertion()', this._channel, mature);
    this._master.signalInsertion (new Date (mature));
  }


  subscribe_extra (topic, on_cb) {
    const t = `keuss:signal:${this._master.ns ()}:extra:${topic}`;
    debug ('subscribing to %s', t);
    return this._factory._channel.subscribe (t, on_cb);
  }

  unsubscribe_extra (subscr) {
    subscr.unsubscribe ();
    debug ('unsubscribed on %j', subscr);
  }

  emit_extra (topic, ev, cb) {
    const t = `keuss:signal:${this._master.ns ()}:extra:${topic}`;
    debug ('emit extra on topic [%s], value [%j]', t, ev);
    this._factory._channel.publish (t, ev);
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

    debug ('created mongo-capped factory with opts %o', opts);
  }

  static Type () {return 'signal:mongo-capped'}
  type () {return MCSignalFactory.Type ()}

  signal (channel, opts) {
    return new MCSignal (channel, this, opts);
  }

  close (cb) {
    this._mubsub.close (cb);
  }
}


function creator (opts, cb) {
  return cb (null, new MCSignalFactory (opts));
}

module.exports = creator;




