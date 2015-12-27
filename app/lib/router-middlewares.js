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
    next(err);
  }
};


/**
 * rather open for now. 
 * @param  {[type]}   req  [description]
 * @param  {[type]}   res  [description]
 * @param  {Function} next [description]
 * @return {[type]}        [description]
 */
 var corsEnable = function() {
  return function(req,res,next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "POST,PUT,GET,HEAD,DELETE");
    next();
  };
};

/**
 * Formatting output data using ember-data format
 * Enables ember-data if config OR query "emberDataCompatible" is set to "true"
 * @param  {[type]}   req  [description]
 * @param  {[type]}   res  [description]
 * @param  {Function} next [description]
 * @return {[type]}        [description]
 */
 var outputSerialize = function(req,res,next,controller) {
  var outputData = {};
  if (res.locals.data) {
    if (config.get('emberDataCompatible') || req.params.emberDataCompatible ) {
      if (res.locals.data instanceof Array) {
        outputData[ controller.model._collectionName ] = res.locals.data;
        res.locals.data = outputData;
        res.locals.meta = {};
        res.locals.meta.total_elements = res.get("TotalItemsCount");
        res.locals.meta.total_pages = res.get("PageItemsCount");
      } else if (res.locals.data instanceof Object) {
        outputData[controller.model._objectCollectionName] = res.locals.data;
        res.locals.data = outputData;
      }
    }
  }
  next();
};

/**
 * Retrieve data from ember-data format
 * @param {data} : object [object/array to format]
 * @return {data/object} [ember-data compatible data]
 */
 var inputUnserialize = function(req,res,next,controller) {
  var type = controller.model._objectCollectionName;
  if ( config.get('emberDataCompatible') || req.params.emberDataCompatible ) {
    if ( req.body && req.body.data[type] ) {
      req.body.data = req.body.data[type];
    }
  }
  next();
};

module.exports = {
  bindAddresses : bindAddresses,
  viewHelpers : viewHelpers,
  validateAPIContentType: validateAPIContentType,
  corsEnable : corsEnable,
  inputUnserialize : inputUnserialize,
  outputSerialize : outputSerialize
};


