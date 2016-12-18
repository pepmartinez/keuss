
var http =    require ('http');
var BaseApp = require ('./app');

BaseApp (function (err, app) {
  if (err) {
    return console.log (err);
  }
  
  var server = http.createServer (app);
  server.listen (3444);

  console.log ('jobq server listening at port %s', 3444);
});
