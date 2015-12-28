"use strict";
/* 
 * local middlewre used by routers
 */
 var _ = require('lodash'),
 debug = require('debug')('pushserver:middlewares'),
 pjson = require('./../../package.json'),
 moment = require('moment'),
 models = require('../models/mongoose-connect').models,
 config = require('config').get('pushserver');

/**
 * viewHelpers middleware : provide additionnal informations to views
 * - allApplication
 * - allTarget
 * - query params
 * @return {[type]} [description]
 */
 var viewHelpers = function () {
  return function(req, res, next) {

    // helpers for breadcrumbs & menu
    res.locals.url = req.path;
    res.locals.urlParts = req.path.split('/').splice(1);

    // moment in views
    res.locals.moment = moment;
    // version package
    res.locals.version = pjson.version;

    // adding extra parameters to the rendered view
    _.keys(req.query).forEach(function(item) {
      res.locals[item] = req.query[item];
    });

    // targets & applications in view
    var app = models.application,
    targ = models.target;
    app.find({}).sort({
      name: 1,
      type: 1
    }).find(function(err, apps) {
      if (err) {
        err.status = 500;
        next(err);
      }
      // reindex the array using the id field
      res.locals.allApplications = _.indexBy(apps, 'id');
      targ.find({}).sort({
        name: 1
      }).find(function(err, targets) {
        if (err) {
          err.status = 500;
          next(err);
        }
        // reindex the array using the id field
        res.locals.allTargets = _.indexBy(targets, 'id');
        //console.log("View params : " , res.locals);
        next();
      });
    });
  }; // return
};
/**
 * Middleware for filtering access to a list of IPs
 * @param {array} bindIps
 * @returns {Function}
 */
 var bindAddresses = function(bindIps) {
  return function(req,res,next) {
    // if param is a string, convert to array
    if (typeof bindIps === "string") {
      bindIps=[bindIps];
    }
    debug("Handling BindAddress for IP %s Path %s and BindAddress %j", req.ip, req.path, bindIps);
    // first check if the bindIps contains 0.0.0.0
    // which is equivalent to "no filtering"
    if (bindIps.indexOf("0.0.0.0")>= 0) {
      return next();
    }
    
    if (bindIps.indexOf(req.ip)>=0) {
      return next();
    } else {
      // not allowed
      var err = new Error('GUI Not Allowed for IP : ' +req.ip);
      err.status = 403;
      return next(err);
    }
  };
};

/**
 * Middleware for validating the content-type of the requests toward REST API
 * @param {type} req
 * @param {type} res
 * @param {type} next
 * @returns {undefined}
 */
 var validateAPIContentType = function(req,res,next) {

  if (!req.is('application/json') && !req.is("application/x-www-form-urlencoded") && !req.is("application/www-form-urlencoded")) {
    var err = new Error("Content-Type must be application/json or application/[x-]www-form-urlencoded (" + req.get('content-type') +") send)");
    err.status = 406;
    next(err);
  } else {
    next();
  }
};

/**
 * rather open for now. 
 * @param  {[type]}   req  [description]
 * @param  {[type]}   res  [description]
 * @param  {Function} next [description]
 * @return {[type]}        [description]
 */
 var corsEnable = function(req,res,next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "POST,PUT,GET,HEAD,DELETE");
  next();
};

/**
 * Formatting output data using ember-data format
 * Enables ember-data if config OR query "emberDataCompatible" is set to "true"
 * @param  {[type]}   req  [description]
 * @param  {[type]}   res  [description]
 * @param  {Function} next [description]
 * @return {[type]}        [description]
 */
var outputSerialize = function (req,res,next) {
  debug(req.query);
  var outputData = {};
  if (res.locals.data) {
    if ( res.locals.options.emberDataCompatible === 'true' ) {
      // ember data format
      if (res.locals.data instanceof Array) {
        outputData[ res.locals.dataType ] = res.locals.data;
      } else if (res.locals.data instanceof Object) {
        outputData[res.locals.dataType] = res.locals.data;
      } else {
        res.status(404);
        var err = new Error('Data not in ember format');
        return next(err);
      }
      // setting meta data
      outputData.meta = res.locals.metaData;
      res.locals.data = outputData;
    } else {
      // v0 format : meta in header
      res.append("TotalItemsCount",res.locals.total_items);
      res.append("PageItemsCount",res.locals.page_items_count);
    }
  }
  next();
};


/**
 * Retrieve data from ember-data format
 * @param {data} : object [object/array to format]
 * @return {data/object} [ember-data compatible data]
 */
var inputUnserialize = function(req,res,next,type) {
  if ( res.locals.options.emberDataCompatible === 'true' ) {
    if ( req.body && req.body.data[type] ) {
      req.body.data = req.body.data[type];
    }
  }
};
/**
 * handling query internal options (not for filtering)
 * @param  {[type]} req    [description]
 * @param  {[type]} res    [description]
 * @param  {Object} next() {             res.locals.options [description]
 * @return {[type]}        [description]
 */
var handleOptions = function (req,res,next) {
  res.locals.options = {};
  if (config.get('emberDataCompatible') || res.locals.options.emberDataCompatible === "true" || req.get('EMBER_DATA_COMPATIBLE') === 'true') {
    res.locals.options.emberDataCompatible = "true";
    delete(req.query.emberDataCompatible);
  }
  next();
};

module.exports = {
  bindAddresses : bindAddresses,
  viewHelpers : viewHelpers,
  validateAPIContentType: validateAPIContentType,
  corsEnable : corsEnable,
  inputUnserialize : inputUnserialize,
  outputSerialize : outputSerialize,
  handleOptions: handleOptions
};