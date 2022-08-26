const should = require ('should');
const async =  require ('async');
const _ =      require ('lodash');

const Local = require ('../signal/local');
const Redis = require ('../signal/redis-pubsub');
const Mongo = require ('../signal/mongo-capped');

// const whyIsNodeRunning = require('why-is-node-running');

const MongoClient = require ('mongodb').MongoClient;

// setTimeout (() => whyIsNodeRunning(), 9000)

_.forEach ({
  Local, 
  Redis, 
  Mongo
}, (CL, CLName) => {
  describe (`${CLName} signaller`, () => {

    before (done => {
      done();
    });

    after (done => async.series ([
      cb => setTimeout (cb, 1000),
      cb => MongoClient.connect ('mongodb://localhost/keuss_signal', (err, cl) => {
        if (err) return done (err);
        cl.db().dropDatabase (() => cl.close (cb))
      })
    ], done));


    it ('creates ok', done => {
      CL ({}, (err, factory) => {
        if (err) return done(err);
        const q = {ns() {return 'the-ns'}, name () {return 'the-queue'}};
        const signal = factory.signal (q, {});
        setTimeout (() => factory.close(done), 500);
      });
    });
    

    it ('signals insertion ok', done => {
      CL ({}, (err, factory) => {
        if (err) return done(err);
        const q = {
          ns() {return 'the-ns'}, 
          name () {return 'the-queue'},
          signalInsertion (d) {
            d.getTime().should.equal (1234567890);
            factory.close(done);
          }
        };

        const signal = factory.signal (q, {});
        setTimeout (() => signal.emitInsertion (new Date(1234567890)), 500);
      });
    });

    it ('signals pause ok', done => {
      CL ({}, (err, factory) => {
        if (err) return done(err);
        const q = {
          ns() {return 'the-ns'}, 
          name () {return 'the-queue'},
          signalPaused(d) {
            d.should.equal (true);
            factory.close(done);
          }
        };

        const signal = factory.signal (q, {});
        setTimeout (() => signal.emitPaused (true), 500);
      });
    });


    describe (`extra/generic pubsub`, () => {
      it ('subscribes and receives info ok on 3 subscribers', done => {
        CL ({}, (err, factory) => {
          if (err) return done(err);
          const q = {ns() {return 'the-ns'}, name () {return 'the-queue'}};
          const signal1 = factory.signal (q, {});
          const signal2 = factory.signal (q, {});
          const signal3 = factory.signal (q, {});

          const evs = [];

          function manage (ev) {
            evs.push (ev);
            if (evs.length == 3) {
              evs.should.eql ([
                { a: 1, b: 'ertwetr' },
                { a: 1, b: 'ertwetr' },
                { a: 1, b: 'ertwetr' }
              ]);

              factory.close(done);
            }
          }

          signal1.subscribe_extra ('the-topic', manage);
          signal2.subscribe_extra ('the-topic', manage);
          signal3.subscribe_extra ('the-topic', manage);

          setTimeout (() => signal2.emit_extra ('the-topic', {a:1, b:'ertwetr'}), 100);
        });
      });


      it ('functions across several queues on the same signaller', done => {
        CL ({}, (err, factory) => {
          if (err) return done(err);
          const signal1 = factory.signal ({ns() {return 'the-ns'}, name () {return 'the-queue-1'}}, {});
          const signal2 = factory.signal ({ns() {return 'the-ns'}, name () {return 'the-queue-2'}}, {});
          const signal3 = factory.signal ({ns() {return 'the-ns'}, name () {return 'the-queue-3'}}, {});

          const evs = [];

          function manage (ev) {
            evs.push (ev);
            if (evs.length == 3) {
              evs.should.eql ([
                { a: 1, b: 'ertwetr' },
                { a: 1, b: 'ertwetr' },
                { a: 1, b: 'ertwetr' }
              ]);

              factory.close(done);
            }
          }

          signal1.subscribe_extra ('the-topic', manage);
          signal2.subscribe_extra ('the-topic', manage);
          signal3.subscribe_extra ('the-topic', manage);

          setTimeout (() => signal2.emit_extra ('the-topic', {a:1, b:'ertwetr'}), 100);
        });
      });

      it ('isolates namespaces', done => {
        CL ({}, (err, factory) => {
          if (err) return done(err);
          const signal1 = factory.signal ({ns() {return 'the-ns-1'}, name () {return 'the-queue'}}, {});
          const signal2 = factory.signal ({ns() {return 'the-ns-2'}, name () {return 'the-queue'}}, {});

          const evs = [];

          async.series ([
            cb => {signal1.subscribe_extra ('the-topic', ev => evs.push ({src: 1, ev})); cb ();},
            cb => {signal2.subscribe_extra ('the-topic', ev => evs.push ({src: 2, ev})); cb ();},
            cb => setTimeout (() => {signal1.emit_extra ('the-topic', {a:1, b:'qwertyuiop'}); cb ()}, 100),
            cb => setTimeout (() => {signal2.emit_extra ('the-topic', {a:2, b:'asdfghjkl'}); cb ()}, 100),
            cb => setTimeout (cb, 100),
          ], err => {
            if (err) return done(err);
            evs.should.eql ([
              { src: 1, ev: { a: 1, b: 'qwertyuiop' } },
              { src: 2, ev: { a: 2, b: 'asdfghjkl' } }
            ]);
            factory.close(done);
          });
        });
      });

      it ('unsubscribes ok and ceases to receive info', done => {
        CL ({}, (err, factory) => {
          if (err) return done(err);
          const signal1 = factory.signal ({ns() {return 'the-ns'}, name () {return 'the-queue'}}, {});

          const evs = [];

          function manage (ev) { evs.push (ev); }

          let subscr = null;
          async.series ([
            cb => {subscr = signal1.subscribe_extra ('the-topic', manage); cb ();},
            cb => setTimeout (() => {signal1.emit_extra ('the-topic', {a:1, b:'ertwetr'}); cb ()}, 100),
            cb => setTimeout (cb, 100),
            cb => {signal1.unsubscribe_extra (subscr); cb (); },
            cb => setTimeout (() => {signal1.emit_extra ('the-topic', {a:2, b:'asdfghjk'}); cb ()}, 100),
          ], err => {
            if (err) return done(err);
            evs.should.eql ([ { a: 1, b: 'ertwetr' } ]);
            factory.close(done);
          });
        });
      });
    
    });


  });
});
