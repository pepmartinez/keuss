const QFactory = require ('./QFactory');

const signal_mongo_capped = require ('./signal/mongo-capped');
const stats_mongo =         require ('./stats/mongo');

var debug = require('debug')('keuss:QFactory_MongoDB_defaults');


class QFactory_MongoDB_defaults extends QFactory {
  constructor (opts) {
    super (opts);

    if (!this._opts.url) {
      this._opts.url = 'mongodb://localhost:27017/keuss';
      debug ('added url default to %s: %o', this._name, this._opts.url);
    }

    if (!this._opts.stats) {
      let arr = this._opts.url.split ('?');
      arr[0] += '_stats';

      this._opts.stats = {
        provider: stats_mongo,
        opts: {
          url: arr.join ('?')
        }
      };

      debug ('added stats default to %s: %o', this._name, this._opts.stats);
    }

    if (!this._opts.signaller) {
      let arr = this._opts.url.split ('?');
      arr[0] += '_signal';

      this._opts.signaller = {
        provider: signal_mongo_capped,
        opts: {
          url: arr.join ('?')
        }
      };

      debug ('added signaller default to %s: %o', this._name, this._opts.signaller);
    }

    debug ('created QFactory_MongoDB_defaults %s with opts %o', this._name, this._opts);
  }
}

module.exports = QFactory_MongoDB_defaults;
