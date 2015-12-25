var debug = require('debug')('pushserver:basicrest'),
  collectionName = require('models/mongoose-models').collectionsName, 
  util = require('util');

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
        // adding the number of element in the header
        if (itemCount) {
          res.append("TotalItemsCount",itemCount);
          res.append("PageItemsCount",objs.length);
        } else {
          res.append("TotalItemsCount",objs.length);
        }
        debug(objs);
        // storing data to be sent
        //res.locals.dataType = collectionName[controller.model.];
        debug(controller.model);
        res.locals.data = objs;
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
        res.status(201)
        // storing data to be sent
        res.locals.data = obj;
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
      }
    });
  },
};

module.exports = rest;