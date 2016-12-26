'use strict';

var should =  require ('should');

var WithLog = require ('../utils/WithLog');

class fake_logger {
  constructor () {
    this._called = 0;
  }
  
  reset () {
    this._called = 0;
  }
  
  called () { return this._called }
  
  _actual_log (args) {
//    console.log.apply (console.log, args);
  }
  
  error ()   {this._actual_log (arguments); this._called++;}
  warn ()    {this._actual_log (arguments); this._called++;}
  info ()    {this._actual_log (arguments); this._called++;}
  verbose () {this._actual_log (arguments); this._called++;}
  debug ()   {this._actual_log (arguments); this._called++;}
  silly ()   {this._actual_log (arguments); this._called++;}
}

class subject extends WithLog {
  constructor (opts) {
    super (opts);
  }
};

describe ('WithLog base class', function () {
  it ('logs ok on standard level (info)', function () {
    var fl = new fake_logger();
    var s = new subject ({logger: fl});
    s._silly ('elles %s %d', 'etwetrew', 666);
    s._debug ('elles %s %d', 'etwetrew', 666);
    s._verbose ('elles %s %d', 'etwetrew', 666);
    s._info ('elles %s %d', 'etwetrew', 666);
    s._warn ('elles %s %d', 'etwetrew', 666);
    s._error ('elles %s %d', 'etwetrew', 666);
    
    fl.called().should.equal(3);
  });
  
  it ('logs ok on set level (silly)', function () {
    var fl = new fake_logger();
    var s = new subject ({logger: fl});
    s.setLevel ('silly');
    s._silly ('elles %s %d', 'etwetrew', 666);
    s._debug ('elles %s %d', 'etwetrew', 666);
    s._verbose ('elles %s %d', 'etwetrew', 666);
    s._info ('elles %s %d', 'etwetrew', 666);
    s._warn ('elles %s %d', 'etwetrew', 666);
    s._error ('elles %s %d', 'etwetrew', 666);
    
    fl.called().should.equal(6);
  });
  
  
  it ('logs ok on ctor-set level (silly)', function () {
    var fl = new fake_logger();
    var s = new subject ({level: 'silly', logger: fl});
    s._silly ('elles %s %d', 'etwetrew', 666);
    s._debug ('elles %s %d', 'etwetrew', 666);
    s._verbose ('elles %s %d', 'etwetrew', 666);
    s._info ('elles %s %d', 'etwetrew', 666);
    s._warn ('elles %s %d', 'etwetrew', 666);
    s._error ('elles %s %d', 'etwetrew', 666);
    
    fl.called().should.equal(6);
  });
  
  it ('logs ok on set level (error)', function () {
    var fl = new fake_logger();
    var s = new subject ({logger: fl});
    s.setLevel ('error');
    s._silly ('elles %s %d', 'etwetrew', 666);
    s._debug ('elles %s %d', 'etwetrew', 666);
    s._verbose ('elles %s %d', 'etwetrew', 666);
    s._info ('elles %s %d', 'etwetrew', 666);
    s._warn ('elles %s %d', 'etwetrew', 666);
    s._error ('elles %s %d', 'etwetrew', 666);
    
    fl.called().should.equal(1);
  });
  
  it ('logs ok on set level (other)', function () {
    var fl = new fake_logger();
    var s = new subject ({logger: fl});
    s.setLevel ('other');
    s._silly ('elles %s %d', 'etwetrew', 666);
    s._debug ('elles %s %d', 'etwetrew', 666);
    s._verbose ('elles %s %d', 'etwetrew', 666);
    s._info ('elles %s %d', 'etwetrew', 666);
    s._warn ('elles %s %d', 'etwetrew', 666);
    s._error ('elles %s %d', 'etwetrew', 666);
    
    fl.called().should.equal(3);
  });
  
  it ('logs ok with name', function () {
    var fl = new fake_logger();
    var s = new subject ({name: 'some name', logger: fl});
    s._silly ('elles %s %d', 'etwetrew', 666);
    s._debug ('elles %s %d', 'etwetrew', 666);
    s._verbose ('elles %s %d', 'etwetrew', 666);
    s._info ('elles %s %d', 'etwetrew', 666);
    s._warn ('elles %s %d', 'etwetrew', 666);
    s._error ('elles %s %d', 'etwetrew', 666);
    
    fl.called().should.equal(3);
  });
});
