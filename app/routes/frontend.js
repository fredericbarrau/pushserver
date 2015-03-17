"use strict";
var
  debug = require('debug')('pushserver:frontend'),
  beautify = require('js-beautify').js_beautify,
  express = require('express'),
  config = require('config').get('pushserver'),
  pushController = require('../controllers/push.controller'),
  middlewares =  require('../lib/router-middlewares.js'),
  _ = require('lodash'),
  router = express.Router();
  
/**
* Cleaning query for paginated views
* Removing unecessary elements from the query (page,skip,limit) and empty parameters
* @param  {[type]} query [description]
* @return {[type]}       [description]
*/
var filterQuery = function(query) {
  var cleanQuery = JSON.parse(JSON.stringify(query));
  // filtering empty param in the query, might crash the search
  _.keys(cleanQuery).forEach(function(item) {
    if (cleanQuery[item] === '') {
      delete cleanQuery[item];
    }
  });
  // cleaning unwanted criteria for search
  delete(cleanQuery.limit);
  delete(cleanQuery.skip);
  delete(cleanQuery.page);
  return cleanQuery;
};

// helpers for views : pass all the applications & moment in view
router.use(middlewares.viewHelpers());

// bind-address setup for the GUI
var bindAddressGUI = config.get('bindAddressGUI');
if (bindAddressGUI) {
  console.log("Limit the GUI access to IP : %s", bindAddressGUI);
  router.use("*", middlewares.bindAddresses(bindAddressGUI));
}

// workaround for the blank page on page refresh
router.get('/*', function(req, res, next) {
  res.setHeader('Last-Modified', (new Date()).toUTCString());
  next();
});

/* home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Pushserver',
    config: beautify(JSON.stringify(global.config), {
      indent_size: 2
    }) // beautiful config
  });
});

var controllers = [];

['application', 'target', 'device'].forEach(function(item) {
  var controller = require('./../controllers/' + item + '.controller');
  controllers[item] = controller;

  debug('Defining UI ' + item + ' routes');

  router.get('/admin/' + item, function(req, res, next) {
    debug('Listing items for ', item);
    // pagination + search
    controller.model.paginate(controller.buildQueryFromObject(filterQuery(req.query)), req.query.page, req.query.limit, function(err, pageCount, objs, itemCount) {
      if (err) {
        next(err);
      } else {
        var renderParams = {
          'objs': objs,
          'pageCount': pageCount,
          'itemCount': itemCount
        };
        debug("render params for view : ", renderParams);
        res.render('administration/' + item + '/index', renderParams);
      }
    }, {
      sortBy: controller.queryDefaultSort
    });
  });

  router.get(['/admin/' + item + '/add'], function(req, res, next) {
    debug('Creation form for ' + item);
    res.render('administration/' + item + '/add', {
      title: item + " creation",
      action: "Add"
    });
  });

  router.post(['/admin/' + item + '/add'], function(req, res, next) {
    debug('Creating an ' + item + ' obj :' + req.body);
    controller.postAction(req.body, function(err) {
      if (err) {
        res.render('administration/' + item + '/add', {
          title: item + " creation",
          action: "Add",
          obj: req.body,
          error: err
        });
      } else {
        res.redirect('/admin/' + item);
      }
    });
  });

  router.get(['/admin/' + item + '/edit/:ID'], function(req, res, next) {
    debug('Editing an ' + item + ' ID = ' + req.params.ID);
    controller.getAction(req.params.ID, function(err, obj) {
      if (err) {
        next(err);
      } else {
        res.render('administration/' + item + '/add', {
          "obj": obj,
          title: item + " edition",
          action: "Edit",
        });
      }
    });
  });

  router.post(['/admin/' + item + '/edit', '/admin/' + item + '/edit/:ID'], function(req, res) {
    req.body.id = req.params.ID;
    // creating an empty record, overidding the value really transmitted, so that empty value (not posted because disabled in the form)
    // are really taken as empty
    var document = new controller.model();
    console.dir(document);
    console.dir(controller.model);
    controller.putAction(req.body, function(err, obj) {
      if (err) {
        if (err.errmsg) {
          err.message = err.errmsg;
        }
        res.render('administration/' + item + '/add', {
          title: item + " edition",
          obj: req.body,
          error: err,
          action: "Edit",
        });
      } else {
        res.redirect('/admin/' + item);
      }
    });
  });

  router.get(['/admin/' + item + '/view/:ID'], function(req, res, next) {
    controller.getAction(req.params.ID, function(err, obj) {
      if (err) {
        next(err);
      } else {
        res.render('administration/' + item + '/view', {
          'obj': obj
        });
      }
    });
  });
});

router.get(['/admin'], function(req, res) {
  res.render('administration/index');
});

router.get(['/push'], function(req, res) {
  res.render('push/add');
});

router.get('/pushes', function(req, res, next) {
  debug('Listing items for pushes');
  pushController.model.paginate(pushController.buildQueryFromObject(filterQuery(req.query)), req.query.page, req.query.limit, function(err, pageCount, objs, itemCount) {
    if (err) {
      next(err);
    } else {
      var renderParams = {
        'objs': objs,
        'pageCount': pageCount,
        'page': req.query.page,
        'limit': req.query.limit,
        'itemCount': itemCount
      };
      res.render('push/index', renderParams);
    }
  }, {
    sortBy: {
      "created.t": -1
    }
  });
});

router.get(['/pushes/view/:ID'], function(req, res, next) {
  pushController.getAction(req.params.ID, function(err, obj) {
    if (err) {
      next(err);
    } else {
      res.render('push/view', {
        'obj': obj
      });
    }
  });
});

/* Configuration List */
router.get('/doc', function(req, res) {
  res.render('documentation');
});
/* Configuration List */
router.get('/config', function(req, res) {
  res.render('config');
});

module.exports = router;