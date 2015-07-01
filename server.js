"use strict";
var
  Promise = require("bluebird"),
  debug = require('debug')('pushserver:server'),
  express = require('express'),
  fs = require('fs'),
  db = require('./app/models/mongoose-connect'),
  path = require('path'),
  logger = require('morgan'),
  bodyParser = require('body-parser'),
  webservice = require('./app/routes/webservice'),
  frontend = require('./app/routes/frontend'),
  config = require('config').get('pushserver'),
  paginate = require('express-paginate'),
  server = express();

Promise.promisifyAll(require('mongoose'));

//loading plugins
//var plugins = require('./app/plugins');

// Access logs management : as output, or in a file
// disabled for testing
if (process.env.NODE_ENV !== "test") {
  var logType = (process.env.NODE_ENV === "production")?"short":"combined";
  if (config.get("log").get("access") === true) {
    server.use(logger(logType));
  } else if (typeof config.get("log").get("access") === "string") {
    // create a write stream (in append mode) 
    var accessLogStream = fs.createWriteStream(config.get("log").get("access"), {flags: 'a'});
     // setup the logger 
    server.use(logger(logType, {stream: accessLogStream}));
  } 
}

// serve static files (should be done by a http server in real world)
server.use(express.static(path.join(__dirname, 'public')));

// urlencoded for GUI & API
server.use('/', bodyParser.urlencoded({
  extended: false
}));

// API REST routes:
server.use('/api', bodyParser.json());
server.use('/api', webservice);

// view engine setup for frontend
server.set('views', path.join(__dirname, 'app/views'));
server.set('view engine', 'jade');

// init pagination middleware
server.use('/',paginate.middleware(10,5000));
server.use('/', frontend);

// catch 404 and forward to error handler
server.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers 

// development error handler
// will print stacktrace
if (server.get('env') === 'development') {
  server.use(function(err, req, res, next) {
    if (req.url.search(/^\/api/) >= 0) {
      console.error("Error %d : %s",err.status,err.message);
      debug('Json error send : ', req.url);
      // API error = json
      res.status(err.status || 500).send({
        message: err.message,
        error: err
      });
    } else {
      debug('Rendering error :', req.url);
      // frontend error = render
      res.render('error', {
        message: err.message,
        error: err
      });
    }
  });
}

// production error handler
// no stacktraces rendered to user
server.use(function(err, req, res, next) {
  if (req.url.search(/^\/api/) >= 0) {
    console.error("Error %d : %s",err.status,err.message);
    // API error = json
    res.status(err.status || 500).send({
      message: err.message,
      error: err
    });
  } else {
    debug('Rendering error :', req.url);
    // frontend error = render
    res.render('error', {
      message: err.message,
      error : err
    });
  }
});

module.exports = server;