"use strict";
var debug = require('debug')('pushserver:basicrest');

// basic_rest.js
var rest = {
  getCollection: function(req, res, next, controller) {
    debug("Params received : %j",req.params);
    debug("Query received : %j",req.query);
    debug("Body received %j", req.body);
    controller.getCollectionAction(req.query, function(err, objs, pageCount, itemCount) {
      if (err) {
        debug("GetCollection Error : ", err);
        err.status = 404;
        next(err);
      } else {
        debug("Number of Item returned =",itemCount);
        // adding the number of elements
        if (itemCount) {
          res.locals.metaData = {
            total_pages : pageCount,
            total_items : itemCount,
            page_items_count : objs.length
          };
        } else {
          res.locals.metaData = {
            total_pages : pageCount,
            total_items : objs.length,
            page_items_count : null
          };
        }
        debug(objs);
        debug(controller.model);
        // storing data to be sent
        res.locals.data = objs;
        res.locals.dataType = controller.model._collectionName;
        next();
      }
    });
  },
  get: function(req, res, next, controller) {
    debug("Params received : %j",req.params);
    debug("Query received : %j",req.query);
    debug("Body received %j", req.body);
    controller.getAction(req.params.ID, function(err, foundObject) {
      if (err) {
        debug("Get Error : ", err);
        next(err);
      } else {
        // storing data to be sent
        res.locals.data = foundObject;
        res.locals.dataType = controller.model._modelName;
        next();
      }
    });
  },

  post: function(req, res, next, controller) {
    debug("Params received : %j",req.params);
    debug("Query received : %j",req.query);
    debug("Body received %j", req.body);
    controller.postAction(req.body, function(err, obj) {
      if (err) {
        debug("Post : ", err);
        err.status = 400;
        next(err);
      } else {
        res.status(201);
        // storing data to be sent
        res.locals.data = obj;
        res.locals.dataType = controller.model._modelName;
        next();
      }
    });
  },
  put: function(req, res, next, controller) {
    debug("Params received : %j",req.params);
    debug("Query received : %j",req.query);
    debug("Body received %j", req.body);
    controller.putAction(req.body, function(err, obj) {
      if (err) {
        debug("Put Error : ", err);
        err.status = 400;
        next(err);
      } else {
        res.status(201);
        // storing data to be sent
        res.locals.data = obj;
        res.locals.dataType = controller.model._modelName;
        next();
      }
    });
  },

  delete: function(req, res, next, controller) {
    debug("Params received : %j",req.params);
    debug("Query received : %j",req.query);
    debug("Body received %j", req.body);
    controller.deleteAction(req.params.ID, req.body, function(err, obj) {
      if (err) {
        debug("Delete Error : ", err);
        err.status = 400;
        next(err);
      } else {
        // storing data to be sent
        res.locals.data = obj;
        res.locals.dataType = controller.model._modelName;
        next();
      }
    });
  }
};

module.exports = rest;