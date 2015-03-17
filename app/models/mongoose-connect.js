// mongoose-connect.js

// Bring Mongoose into the app
var mongoose = require('mongoose'),
 config = require('config').pushserver.dbConfig;

// Create the database connection
mongoose.connect(config.connectionUrl);

// // CONNECTION EVENTS
// // When successfully connected
mongoose.connection.on('connected', function () {
  console.log('Mongoose default connection open to ' + config.connectionUrl);
});

// If the connection throws an error
mongoose.connection.on('error', function (err) {
  console.log('Mongoose default connection error: ' + err);
  process.exit(1);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {
  console.log('Mongoose default connection disconnected');
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function () {
  mongoose.connection.close(function () {
    console.log('Mongoose default connection disconnected through app termination');
    process.exit(0);
  });
});

// BRING IN YOUR SCHEMAS & MODELS
var models = require('./mongoose-models');
module.exports =  {
  mongoose : mongoose, 
  models : models.models, 
  collectionsName : models.collectionsName
}; 