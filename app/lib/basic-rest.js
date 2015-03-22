var debug = require('debug')('pushserver:basicrest'),
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
        // adding the number of elements
        objs.meta = {
            "total_pages" : pageCount,
            "total_elements" : itemCount
        };
        res.json(objs);
      }
    });
  },
  get: function(req, res, next, controller) {
    debug("Params received : %j",req.params);
    debug("Query received : %j",req.query);
    debug("Body received %j", req.body);
    controller.getAction(req.params.ID, function(err, obj) {
      if (err) {
        debug("Get Error : ", err);
        next(err);
      } else {
        res.json(obj);
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
        res.status(201).json(obj);
      }
    });
  },
  put: function(req, res, next, controller) {
    debug("Params received : %j",req.params);
    debug("Query received : %j",req.query);
    debug("Body received %j", req.body);
    controller.putAction(req.params.ID,req.body, function(err, obj) {
      if (err) {
        debug("Put Error : ", err);
        err.status = 400;
        next(err);
      } else {
        res.status(201).json(obj);
      }
    });
  },

  delete: function(req, res, next, controller) {
    debug("Params received : %j",req.params);
    debug("Query received : %j",req.query);
    debug("Body received %j", req.body);
    controller.deleteAction(req.params.ID, req.body, function(err) {
      if (err) {
        debug("Delete Error : ", err);
        err.status = 400;
        next(err);
      } else {
        res.json({});
      }
    });
  },
};

module.exports = rest;