const _ =    require ('lodash');
const uuid = require ('uuid');
const pg =   require ('pg');

const Queue =    require ('../Queue');
const QFactory = require ('../QFactory');

const debug = require('debug')('keuss:Queue:postgres');

class PGQueue extends Queue {


	// TODO escape table name properly , as identifier
  //////////////////////////////////////////////
  constructor (name, factory, opts, orig_opts) {
    super (name, factory, opts, orig_opts);
    this._pool = factory._pool;
    this._tbl_name = this._name; 
  }


  /////////////////////////////////////////
  static Type () {
    return 'postgres:simple';
  }


  /////////////////////////////////////////
  type () {
    return 'postgres:simple';
  }


  //////////////////////////////////////////////
  // ensure table and indexes exists
  _init (cb) {
    this._pool.query (`
    CREATE TABLE IF NOT EXISTS ${this._tbl_name} (
      _id      VARCHAR(64) PRIMARY KEY,
      _pl      JSONB,
      mature   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
      tries    INTEGER DEFAULT 0 NOT NULL,
      reserved TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_${this._tbl_name}_mature ON ${this._tbl_name} (mature);
    `, err => cb (err));
  }


  /////////////////////////////////////////
  // add element to queue
  insert (entry, cb) {
    const _id =     entry.id || uuid.v4();
    const tries =   entry.tries || 0;
    const mature =  new Date (entry.mature);

    const pl = {
      payload: entry.payload,
      hdrs:    entry.hdrs || {}
    }

    if (Buffer.isBuffer (pl.payload)) {
      pl.payload = pl.payload.toString ('base64');
      pl.type = 'buffer';
    }

    this._pool.query (`INSERT INTO ${this._tbl_name} VALUES($1, $2, $3, $4)`, [_id, pl, mature, tries], (err, res) => {
      if (err) return cb (err);
      cb (null, _id)
    })
  }


  /////////////////////////////////////////
  // get element from queue
  get (cb) {    
    this._pool.query (`
      DELETE FROM ${this._tbl_name}
      WHERE _id = (
        SELECT _id
        FROM ${this._tbl_name}
        WHERE mature < now()
        ORDER BY mature
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *;
    `, (err, res) => {
      if (err) return cb (err);

      if (_.size (res.rows) == 0) return cb (null, null); // not found
      
      const pl = res.rows[0];

      _.merge (pl, pl._pl);
      delete (pl._pl);

      if (pl.type == 'buffer') {
        try {
          pl.payload = Buffer.from (pl.payload, 'base64');
        } catch (e) {
        }
      }

      cb (null, pl);
    })
  }


  //////////////////////////////////
  // reserve element: call cb (err, pl) where pl has an id
  reserve (cb) {
    const delay = this._opts.reserve_delay || 120;

    this._pool.query (`
      UPDATE ${this._tbl_name}
      SET
        tries = tries + 1,
        mature = now() + make_interval(secs => ${delay}),
        reserved = now()
      WHERE _id = (
        SELECT _id
        FROM ${this._tbl_name}
        WHERE mature < now()
        ORDER BY mature
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *;
    `, (err, res) => {
      if (err) return cb (err);
      
      if (_.size (res.rows) == 0) return cb (null, null); // not found
      
      const pl = res.rows[0];

      _.merge (pl, pl._pl);
      delete (pl._pl);

      // adjust tries to pre-update
      pl.tries--;

      if (pl.type == 'buffer') {
        try {
          pl.payload = Buffer.from (pl.payload, 'base64');
        } catch (e) {
        }
      }

      cb (null, pl);
    })
  }


  //////////////////////////////////
  // commit previous reserve, by p.id
  commit (id, cb) {
    if (!uuid.validate (id)) return cb ('id [' + id + '] can not be used as commit id: not a valid UUID');

    this._pool.query (`
      DELETE FROM ${this._tbl_name}
      WHERE _id = $1
      AND reserved IS NOT NULL
    `, 
    [id],
    (err, res) => {
      if (err) return cb (err);
      cb (null, res && (res.rowCount == 1));
    })
  }


  //////////////////////////////////
  // rollback previous reserve, by p.id
  rollback (id, next_t, cb) {
    if (_.isFunction (next_t)) {
      cb = next_t;
      next_t = null;
    }

    if (!uuid.validate (id)) return cb ('id [' + id + '] can not be used as rollback id: not a valid UUID');

    const nxt = (next_t ? new Date (next_t) : Queue.now ());

    this._pool.query (`
      UPDATE ${this._tbl_name}
      SET
        reserved = NULL,
        mature = $1
      WHERE _id = $2
      AND reserved IS NOT NULL
    `, 
    [nxt, id],
    (err, res) => {
      if (err) return cb (err);
      cb (null, res && (res.rowCount == 1));
    })
  }


  //////////////////////////////////
  // queue size including non-mature elements
  totalSize (cb) {
    this._pool.query (`
      SELECT COUNT(*)
      FROM ${this._tbl_name}
    `, 
    (err, res) => {
      if (err) return cb (err);
      cb (null, parseInt (res.rows[0].count));
    })
  }


  //////////////////////////////////
  // queue size NOT including non-mature elements
  size (cb) {
    this._pool.query (`
      SELECT COUNT(*)
      FROM ${this._tbl_name}
      WHERE mature < now()
    `, 
    (err, res) => {
      if (err) return cb (err);
      cb (null, parseInt (res.rows[0].count));
    })
  }


  //////////////////////////////////
  // queue size of non-mature elements only
  schedSize (cb) {
    this._pool.query (`
      SELECT COUNT(*)
      FROM ${this._tbl_name}
      WHERE mature >= now()
      AND reserved IS NULL
    `, 
    (err, res) => {
      if (err) return cb (err);
      cb (null, parseInt (res.rows[0].count));
    })
  }


  //////////////////////////////////
  // queue size of reserved elements only
  resvSize (cb) {
    this._pool.query (`
      SELECT COUNT(*)
      FROM ${this._tbl_name}
      WHERE mature >= now()
      AND reserved IS NOT NULL
    `, 
    (err, res) => {
      if (err) return cb (err);
      cb (null, parseInt (res.rows[0].count));
    })
  }


  /////////////////////////////////////////
  // get element from queue
  next_t (cb) {  
    this._pool.query (`
      SELECT mature
      FROM ${this._tbl_name}
      ORDER BY mature
      LIMIT 1
    `, (err, res) => {
      if (err)                    return cb (err);
      if (_.size (res.rows) == 0) return cb (null, null); // not found
      
      cb (null, res.rows[0].mature);
    });
  }


  //////////////////////////////////////////////
  // remove by id
  remove (id, cb) {
    if (!uuid.validate (id)) return cb ('id [' + id + '] can not be used as remove id: not a valid UUID');

    this._pool.query (`
      DELETE FROM ${this._tbl_name}
      WHERE _id = $1
      AND reserved IS NULL
    `, 
    [id],
    (err, res) => {
      if (err) return cb (err);
      cb (null, res && (res.rowCount == 1));
    })
  }


  ///////////////////////////////////////////////////////////////////////////////
  // private parts

};



///////////////////////////////////////////////////////////////////////////////
class Factory extends QFactory {
  constructor (opts, pg_pool) {
    super (opts);
    this._pool = pg_pool;
    debug ('crated Factory with options %j', opts);
  }

  queue (name, opts, cb) {
    if (!cb) {
      cb = opts;
      opts = {};
    }
    
    const full_opts = {};
    _.merge(full_opts, this._opts, opts);
    debug ('creating queue with full_opts %j', full_opts);

    const q = new PGQueue (name, this, full_opts, opts);
    q._init (err => {
      if (err) return cb (err);
      cb (null, q);
    });
  }

  close (cb) {
    super.close (() => {
      debug ('closing pool...');
      this._pool.end (cb);
    });
  }

  type () {
    return PGQueue.Type ();
  }

  capabilities () {
    return {
      sched:    true,
      reserve:  true,
      pipeline: false,
      tape:     false,
      remove:   true
    };
  }
}


///////////////////////////////////////////////////////////////////////////////
function creator (opts, cb) {
  const _opts = opts || {};

  debug ('Creator: creating pool with %j', _opts);

  const dflt = {
    user:     'pg', 
    password: 'pg',
    host:     'localhost',
    port:     5432,
    database: 'pg'
  }

  const pool = new pg.Pool(_.merge ({}, dflt, _opts.postgres));

  // ensure the pool can connect
  pool.query ('select 1', err => {
    if (err) return cb (err);

    debug ('pool created, can connect. Creating Factory...');
    const F = new Factory (_opts, pool);
    F.async_init (err => cb (err, F));
  });
}

module.exports = creator;
