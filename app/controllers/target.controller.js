//target.controller.js
var debug = require('debug')('pushserver:target.controller'),
  CrudController = require('./crud.controller'),
  mongoose = require('mongoose'),
  util = require('util');

/**
 * [TargetController description]
 * @param {[type]} mongooseModel [description]
 */
var TargetController = function(mongooseModel) {
  CrudController.call(this);
  this.model = mongooseModel;
  this.queryKey = ["name"];
  this.queryDefaultSort = { "name": 1};
  var self = this;
};
util.inherits(TargetController, CrudController);

module.exports = new TargetController(mongoose.model('targets'));