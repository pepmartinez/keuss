const _ =    require ('lodash');
const uuid = require ('uuid');
const pg =   require ('pg');

const Queue =    require ('../Queue');
const QFactory = require ('../QFactory');

const debug = require('debug')('keuss:Queue:postgres');

class PGQueue extends Queue {

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
  init (cb) {
    // TODO: Check reserved names to avoid crash on creating the table? see  pg_get_keywords()
    // TODO: use JSON type for _pl? see https://www.postgresql.org/docs/current/datatype-json.html
    this._pool.query (`
    CREATE TABLE IF NOT EXISTS ${this._tbl_name} (
      _id      VARCHAR(64) PRIMARY KEY,
      _pl      TEXT,
      mature   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
      tries    INTEGER DEFAULT 0 NOT NULL,
      reserved TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_mature ON ${this._tbl_name} (mature);
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

    this._pool.query (`INSERT INTO ${this._tbl_name} VALUES($1, $2, $3, $4)`, [_id, JSON.stringify (pl), mature, tries], (err, res) => {
      if (err) return cb (err);

      // TODO assert res.rowCount==1 ?
      cb (null, _id)
    })
  }


  /////////////////////////////////////////
  // get element from queue
  get (cb) { 
    this._pool.connect().then(client => {
         client.query (`
            BEGIN;
              WITH cte AS (
                SELECT *
                FROM ${this._tbl_name}
                WHERE mature < now()
                ORDER BY mature
                FOR UPDATE SKIP LOCKED
                LIMIT 1
              )
              DELETE FROM ${this._tbl_name}
              WHERE _id = (SELECT _id FROM cte LIMIT 1)
              RETURNING *;
            COMMIT;
        `).then( res => {
            if (res[1].rowCount == 0) 
            {
              // No elements in the queue
                return cb (null, null); 
            }
            const pl = res[1].rows[0];

            // re-hydrate _pl
            pl._pl = JSON.parse (pl._pl);
            _.merge (pl, pl._pl);
            delete (pl._pl);

            if (pl.type == 'buffer') {
              try {
                pl.payload = Buffer.from (pl.payload, 'base64');
              } catch (e) {
              }
            }
            return cb (null, pl);
          }).catch (err => {
            client.query('ROLLBACK');
              // serialization error, let it flow and be retried. Should not happen with a table-lock
              // TODO: Not sure if this is still needed
              if (err.code == '40001') return cb (null, null);
              return cb (err);
          }).finally(() => {client.release()}); 
    });
  }


  //////////////////////////////////
  // reserve element: call cb (err, pl) where pl has an id
  reserve (cb) {
    const delay = this._opts.reserve_delay || 120;
    // TODO: Ensure the new 'reserved' update condition is valid
    this._pool.connect().then(client => {
         client.query (`
          BEGIN;
            WITH cte AS (
              SELECT *
              FROM ${this._tbl_name}
              WHERE mature < now()
              AND (reserved IS NULL OR reserved < now())
              ORDER BY mature
              FOR UPDATE SKIP LOCKED
              LIMIT 1
            )
            UPDATE ${this._tbl_name}
            SET
              tries = tries + 1,
              mature = mature + make_interval(secs => ${delay}),
              reserved = now() + make_interval(secs => ${delay})
            WHERE _id = (SELECT _id FROM cte LIMIT 1)
            RETURNING *;
          COMMIT;
      `)
      .then( res => {
          if (res[1].rowCount == 0) 
          {
              return cb (null, null); // not found
          }
          const pl = res[1].rows[0];

          // re-hydrate _pl
          pl._pl = JSON.parse (pl._pl);
          _.merge (pl, pl._pl);
          delete (pl._pl);

          // adjust tries to pre-update
          pl.tries--;

          if (pl.type == 'buffer') {
            try {
              pl.payload = Buffer.from (pl.payload, 'base64');
            } catch (e) {
              // TODO: warn? Error?
            }
          }
          return cb (null, pl);
      }).catch (err => {
          client.query('ROLLBACK');
          // serialization error, let it flow and be retried. Should not happen with a table-lock
          // TODO: Not sure if this is still needed
          console.log("rollback!");
          if (err.code == '40001') return cb (null, null);
          return cb (err);
      }).finally(() => client.release()); 
    });
  }


  //////////////////////////////////
  // commit previous reserve, by p.id
  commit (id, cb) {
    if (!uuid.validate (id)) return cb ('id [' + id + '] can not be used as commit id: not a valid UUID');

    // TODO: Maybe this does not need to be transacional
    this._pool.connect().then(client => {
          client.query('BEGIN').then( () => {
          client.query (`
                DELETE FROM ${this._tbl_name}
                WHERE _id = $1
                AND reserved IS NOT NULL
                RETURNING *;
              `, [id]) 
          .then( res => {
                client.query('COMMIT').then( () =>
                  cb (null, res && (res.rowCount == 1)));
          }).catch (err => {
              client.query('ROLLBACK');
              console.log ('COMMIT', err)
              return cb (err);   
          }).finally(() => client.release() )
      });
  })
}


  //////////////////////////////////
  // rollback previous reserve, by p.id
  rollback (id, next_t, cb) {
    console.log(`rolling back element ${id}` )
    if (_.isFunction (next_t)) {
      cb = next_t;
      next_t = null;
    }

    if (!uuid.validate (id)) return cb ('id [' + id + '] can not be used as rollback id: not a valid UUID');

    const nxt = (next_t ? new Date (next_t) : Queue.now ());
    // TODO: Make this transactional?
    this._pool.query (`
      BEGIN;
      UPDATE ${this._tbl_name}
      SET
        reserved = NULL,
        mature = $1
      WHERE _id = $2
      AND reserved IS NOT NULL;
      COMMIT;
    `, 
    [nxt, id],
    (err, res) => {
      if (err) console.log ('ROLLBACK', err)
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
    // TODO: Check if this needs change
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
    // TODO: Not sure what this is need for...
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
   // TODO: Make this transactional?
    this._pool.query (`
      BEGIN;
      DELETE FROM ${this._tbl_name}
      WHERE _id = $1
      AND reserved IS NULL;
      COMMIT;
    `, 
    [id],
    (err, res) => {
      if (err) console.log ('REMOVE', err)
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
    const full_opts = {};
    _.merge(full_opts, this._opts, opts);
    debug ('creating queue with full_opts %j', full_opts)
    const q = new PGQueue (name, this, full_opts, opts);

    if (cb) {
      q.init (err => cb (err, q));
    }
    else {
      return q;
    }
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

  // TODO: adjust to your db params
  const dflt = {
    user:     'postgres', 
    password: 'poppwd',
    host:     'localhost',
    port:     5555,
    database: 'dbpop'
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
