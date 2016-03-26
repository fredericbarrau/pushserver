"use strict";
// webservices.js
var debug = require('debug')('pushserver:webservices'),
  express = require('express'),
  router = express.Router(),
  config = require('config').get('pushserver'),
  middlewares = require('../lib/router-middlewares'),
  basicRest = require('./../lib/basic-rest'),
  // CONTROLLERS
  applicationController = require('./../controllers/application.controller'),
  deviceController = require('./../controllers/device.controller'),
  targetController = require('./../controllers/target.controller'),
  pushController = require('./../controllers/push.controller');

// bind-address setup for the API
var bindAddressAPI = config.get('bindAddressAPI');
if (bindAddressAPI) {
  console.log("Limit the API access to IP : %s", bindAddressAPI);
  console.log("/api/devices/device & /api/devices are allowed to all for POST & PUT");
  
  router.all("*", function(req, res, next) {
    // device post & put are opened for access by any IP
    if ((["POST", "PUT"].indexOf(req.method) >= 0) && (["/devices", "/devices/device"].indexOf(req.path) >= 0)) {
      next();
    } else {
      // reusing a middleware... inside a middleware.
      return middlewares.bindAddresses(bindAddressAPI)(req,res,next);
    }
  });
}

// validating content-type
router.post("*", middlewares.validateAPIContentType());
router.put("*", middlewares.validateAPIContentType());
// Adding CORS policy & handling format options
router.all("*", middlewares.cors(), middlewares.handleOptions());

/* APPLICATION RESTful. */
['application', 'target', 'device'].forEach(function(item) {
  var controller = null;
  switch (item) {
    case "application":
      controller = applicationController;
      break;
    case "target":
      controller = targetController;
      break;
    case "device":
      controller = deviceController;
      break;
    default:
      console.error("Unknown controller %s", item);
      break;
  }

  debug('Defining Rest ' + item + ' routes');
  router.get('/' + item + 's', function(req, res, next) {
    basicRest.getCollection(req, res, next, controller);
  });

  router.get(['/' + item + 's/' + item + '/:ID','/' + item + 's/:ID'], function(req, res, next) {
    basicRest.get(req, res, next, controller);
  });

  router.delete(['/' + item + 's/' + item + '/:ID','/' + item + 's/:ID'], function(req, res, next) {
    basicRest.delete(req, res, next, controller);
  });

  router.put(['/' + item + 's/' + item,'/' + item + 's/:ID'],
    middlewares.inputUnserialize(item),
    function(req, res, next) {
      basicRest.put(req, res, next, controller);
  });

  router.post(['/' + item + 's/' + item, '/' + item + 's'], 
    middlewares.inputUnserialize(item),
    function(req, res, next) {
      basicRest.post(req, res, next, controller);
  });
});

/* Push Rest */
router.get('/pushes', function(req, res, next) {
  basicRest.getCollection(req, res, next, pushController);
});

router.post(['/pushes', '/pushes/push'],
  middlewares.inputUnserialize("push"),
  function(req, res, next) {
  if (req.body.simulate) {
    // perform simulation of sending a push : return the tokens
    pushController.simulateAction(req.body, function(err, tokens) {
      if (err) {
        err.status = 400;
        next(err);
      } else {
        res.status(201);
        res.locals.data  = tokens;
        res.locals.dataType = 'push';
        next();
      }
    });
  } else {
    basicRest.post(req, res, next, pushController);
  }
});

router.get(['/pushes/push/:ID/','/pushes/:ID'], function(req, res, next) {
  basicRest.get(req, res, next, pushController);
});
// formatting & sending data
router.all('*',
  // formatting output
  middlewares.outputSerialize(),
  // sending output
  function(req, res, next) {
    if (res.locals.data) {
      res.json(res.locals.data);  
    } else {
      next();  
    }
});

module.exports = router;