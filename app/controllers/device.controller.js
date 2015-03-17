//device.controller.js
var debug = require('debug')('pushserver:device.controller'),
  CrudController = require('./crud.controller'),
  mongoose = require('mongoose'),
  util = require('util');

var DeviceController = function(mongooseModel) {
  CrudController.call(this);
  this.model = mongooseModel;
  this.queryKey = ["token","application","type"];
  this.queryDefaultSort = { "type" : 1,"application" :1,"name":1};
  var self= this;
};
util.inherits(DeviceController, CrudController);

/**
 * Prepare the object before insertion into database
 * @param {object} obj : object to prepare
 * @param {boolean} create : prepare object for creation if true
 * @returns {object}
 */
DeviceController.prototype.prepareObject = function(obj, create) {
  var now = new Date();
  if (create) {
    obj["created"] = {
      "date" : now,
      "t" : now.getTime()
    };
  }
  obj["updated"] = {
    "date":now,
    "t" : now.getTime()
  };
  return obj;
};


module.exports = new DeviceController(mongoose.model('devices'));