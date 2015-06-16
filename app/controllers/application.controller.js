//application.controller.js
var debug = require('debug')('pushserver:application.controller'),
  CrudController = require('./crud.controller'),
  mongoose = require('mongoose'),
  util = require('util'),
  pushConnections = require('../lib/push-connections');
/**
 * [ApplicationController description]
 * @param {[type]} mongooseModel [description]
 */
var ApplicationController = function(mongooseModel) {
  CrudController.call(this);
  this.model = mongooseModel;
  this.queryKey = ["name","type"];
  this.queryDefaultSort = { "name": 1,"type" : 1};
  var self= this;
};
util.inherits(ApplicationController, CrudController);

// Adding listeners
var app = new ApplicationController(mongoose.model('applications'));

app.addListener('putAction',function(app){
  console.log('Application modified : ' + app.name);
  pushConnections.setConnection(app);
});

app.addListener('postAction',function(app){
  console.log('Application added : ' + app.name);
  pushConnections.setConnection(app);
});

app.addListener('deleteAction',function(app){
  console.log('Application removed : ' + app.name);
  pushConnections.removeConnection(app);
  //deleting devices for this app
  mongoose.model('devices').remove({"application":app.id}).exec();
});

module.exports = app;
