var mitt =   require ('mitt');
var Signal = require ('../Signal');

var debug = require('debug')('keuss:Signal:local');


//////////////////////////////////////////////////////////////////////
class LocalSignal extends Signal {
  constructor (queue, factory, opts) {
    super (queue, opts);
    this._factory = factory;
    this._channel = 'keuss:signal:' + queue.ns () + ':' + queue.name ();

    this._factory._emitter.on (this._channel, message => {
      var msg = message.split (' ');

      if (msg.length == 1) {
        var mature = parseInt (message);
        debug ('got insertion event on ch [%s], message is %s, calling master.emitInsertion()', this._channel, message);
        this._master.signalInsertion (new Date (mature));
      }
      else {
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
      }
    });

    debug ('created LocalSignal for channel %s', this._channel);
  }


  //////////////////////////////////////////////////////////////////////
  type () {
    return LocalSignalFactory.Type ();
  }


  //////////////////////////////////////////////////////////////////////
  emitInsertion (mature, cb) {
    debug ('got insertion event [%o], relay on local mitt', mature);
    this._factory._emitter.emit (this._channel, mature.getTime () + '');
  }

  //////////////////////////////////////////////////////////////////////
  emitPaused (paused, cb) {
    debug ('got paused event [%d], relay on local mitt', paused);
    this._factory._emitter.emit (this._channel, `p ${paused}`);
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
class LocalSignalFactory {
  constructor (opts) {
    this._emitter = mitt();
    debug ('created local factory');
  }


  //////////////////////////////////////////////////////////////////////
  static Type () {
    return 'signal:local';
  }


  //////////////////////////////////////////////////////////////////////
  type () {
    return LocalSignalFactory.Type ();
  }


  //////////////////////////////////////////////////////////////////////
  signal (queue, opts) {
    return new LocalSignal (queue, this, opts);
  }


  //////////////////////////////////////////////////////////////////////
  subscribe_extra (ns, topic, on_cb) {
    const t = `keuss:signal:${ns}:extra:${topic}`;
    debug ('subscribing to ns [%s], topic [%s]', ns, t);

    const s = {
      n: ns,
      t: t,
      f: (msg => on_cb (msg))
    };

    this._emitter.on (s.t, s.f); 
    return s;
  }


  //////////////////////////////////////////////////////////////////////
  unsubscribe_extra (s) {
    this._emitter.off (s.t, s.f); 
    debug ('unsubscribed on %s', s.t);
  }


  //////////////////////////////////////////////////////////////////////
  emit_extra (ns, topic, ev, cb) {
    const t = `keuss:signal:${ns}:extra:${topic}`;
    debug ('emit extra on topic [%s], value [%j]', t, ev);
    this._emitter.emit (t, ev);
  }


  //////////////////////////////////////////////////////////////////////
  close (cb) {
    cb ();
  }
}


//////////////////////////////////////////////////////////////////////
function creator (opts, cb) {
  return cb (null, new LocalSignalFactory (opts));
}

module.exports = creator;

