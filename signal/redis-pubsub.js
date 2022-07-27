var mitt =  require ('mitt');
var async = require ('async');
var _ =     require('lodash');

var RedisConn = require ('../utils/RedisConn');
var Signal =    require ('../Signal');

var debug = require('debug')('keuss:Signal:RedisPubsub');


//////////////////////////////////////////////////////////////////////
class RPSSignal extends Signal {
  constructor (queue, factory, opts) {
    super (queue, opts);
    this._factory = factory;

    this._channel = 'keuss:signal:' + queue.ns () + ':' + queue.name ();
    this._opts = opts || {};

    this._factory._emitter.on (this._channel, message => {
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

    this._rediscl_pub = this._factory._rediscl_pub;
    this._rediscl_sub = this._factory._rediscl_sub;

    this._rediscl_sub.subscribe (this._channel);

    debug ('created redis-pubsub signaller for topic %s with opts %o', this._topic_name, opts);
  }


  //////////////////////////////////////////////////////////////////////
  type () {
    return RPSSignalFactory.Type ();
  }


  //////////////////////////////////////////////////////////////////////
  emitInsertion (mature, cb) {
    debug ('emit insertion on channel [%s] value [%d])', this._channel, mature);
    this._rediscl_pub.publish (this._channel, mature.getTime());
  }


  //////////////////////////////////////////////////////////////////////
  emitPaused (paused, cb) {
    debug ('emit paused on channel [%s], value [%b]', this._channel, paused);
    this._rediscl_pub.publish (this._channel, `p ${paused}`);
  }


  //////////////////////////////////////////////////////////////////////
  _insertionEvent (mature) {
    debug ('got insertion event on ch [%s], mature is %s, calling master.emitInsertion()', this._channel, mature);
    this._master.signalInsertion (new Date (mature));
  }


  //////////////////////////////////////////////////////////////////////
  subscribe_extra (topic, on_cb) {
    return this._factory.subscribe_extra (this._master.ns (), topic, on_cb);
  }


  //////////////////////////////////////////////////////////////////////
  unsubscribe_extra (subscr) {
    this._factory.unsubscribe_extra (subscr);
  }


  //////////////////////////////////////////////////////////////////////
  emit_extra (topic, ev, cb) {
    this._factory.emit_extra (this._master.ns (), topic, ev, cb);
  }
}


//////////////////////////////////////////////////////////////////////
class RPSSignalFactory {
  constructor (opts) {
    this._opts = opts || {};
    this._emitter = mitt ();
    this._rediscl_pub = RedisConn.conn (this._opts);
    this._rediscl_sub = RedisConn.conn (this._opts);

    this._rediscl_sub.on ('message', (channel, message) => {
      // convey to local through mitt
      this._emitter.emit (channel, message);
    });

    debug ('created redis-pubsub factory with opts %o', opts);
  }


  //////////////////////////////////////////////////////////////////////
  static Type () {
    return 'signal:redis-pubsub';
  }


  //////////////////////////////////////////////////////////////////////
  type () {
    return RPSSignalFactory.Type ();
  }


  //////////////////////////////////////////////////////////////////////
  signal (channel, opts) {
    debug ('creating redis-pubsub signaller with opts %o', opts);
    return new RPSSignal (channel, this, opts);
  }


  //////////////////////////////////////////////////////////////////////
  subscribe_extra (ns, topic, on_cb) {
    const t = `keuss:signal:${ns}:extra:${topic}`;
    debug ('subscribing to ns [%s], topic [%s]', ns, t);

    const s = {
      n: ns,
      t: t,
      f: (msg => on_cb (JSON.parse (msg)))
    };

    this._emitter.on (s.t, s.f);
    this._rediscl_sub.subscribe (s.t);
    return s;
  }


  //////////////////////////////////////////////////////////////////////
  unsubscribe_extra (subscr) {
    this._rediscl_sub.unsubscribe (subscr.t);
    this._emitter.off (subscr.t, subscr.f); 
    debug ('unsubscribed on %j', subscr);
  }


  //////////////////////////////////////////////////////////////////////
  emit_extra (ns, topic, ev, cb) {
    const t = `keuss:signal:${ns}:extra:${topic}`;
    const v = JSON.stringify(ev);
    debug ('emit extra on ns [%s], topic [%s], value [%j]', ns, t, ev);
    this._rediscl_pub.publish (t, v);
  }


  //////////////////////////////////////////////////////////////////////
  close (cb) {
    async.parallel ([
      cb => this._rediscl_pub.quit (cb),
      cb => this._rediscl_sub.quit (cb)
    ], cb);
  }
}


  //////////////////////////////////////////////////////////////////////
function creator (opts, cb) {
  return cb (null, new RPSSignalFactory (opts));
}

module.exports = creator;
