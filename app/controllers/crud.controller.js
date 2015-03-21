"use strict";
//rest.controller.js
var debug = require('debug')('pushserver:crud.controller'),
  EventEmitter = require('events').EventEmitter,
  util = require('util'),
  _ = require('lodash');

var CrudController = function(model) {
  this.model = model;
  this.emberDataCompatible = true;
  this.queryKey = [];
  this.queryDefaultSort = {
    _id: 1
  }; // used by getCollection
  // use full text search instead of strict equality on name
  this.querySearchOperatorOverride = {
    "name": "$regex"
  };
};
// CrudController can emit events
util.inherits(CrudController, EventEmitter);

CrudController.prototype.getCollectionAction = function(query, callback) {
  var self = this;
  debug("query = ", query);
  var mongoQuery = self.buildQueryFromObject(query);
  // paginated results
  self.model.paginate(mongoQuery || {}, query.page || 1, query.limit || 0, function(err, pageCount, objs, itemCount) {
    self._getCollectionActionCallback(err, objs, pageCount, itemCount, callback);
  }, {
    sortBy: self.queryDefaultSort || {}
  });
};

CrudController.prototype._getCollectionActionCallback = function(err, foundObjects, pageCount, itemCount, callback) {
  var self = this,
    outputData = {};
  if (err) {
    debug(err);
    debug("Did not find object with model : ", self.model.modelName);
    if (callback) {
      return callback(err);
    }
  } else if (callback) {
    // removing mongoose interval version number : no need for the user
    foundObjects.forEach(function(value, key) {
      foundObjects[key] = self.cleanObject(value);
    });
    // Formatting data output to be ember-data compatible
    outputData[self.model._collectionName] = foundObjects;
    foundObjects = self.emberDataSerialize(foundObjects);
    callback(null, foundObjects, pageCount, itemCount);
  }
  self.emit('getCollectionAction', foundObjects);
};

CrudController.prototype.getAction = function(id, callback) {
  var self = this;
  self.model.findById(id, function(err, obj) {
    if (err || obj === null) {
      err = new Error("Object not found for ID :" + id);
      err.status = 404;
      debug("Did not find object ID : ", id, " with model : ", self.model.modelName);
      if (callback) {
        return callback(err);
      }
    } else if (callback) {
      // removing mongoose interval version number : no need for the user
      obj = self.emberDataSerialize(self.cleanObject(obj));
      callback(null, obj);
    }
    self.emit('getAction', obj);
  });
};

CrudController.prototype.postAction = function(obj, callback) {
  var self = this;
  obj = self.emberDataUnserialize(obj);
  try {
    obj = self.prepareObject(obj, true);
  } catch (error) {
    return callback(new Error(error));
  }
  self.model.create(obj, function(err, createdObject) {
    if (err) {
      console.error('Error while creating object :', obj);
      console.error(err);
      debug('Could not create object ', obj, ' : ', err.message);
      if (callback) {
        return callback(err);
      }
    } else if (callback) {
      // removing mongoose interval version number : no need for the user
      createdObject = self.emberDataSerialize(self.cleanObject(createdObject));
      callback(null, createdObject);
    }
    self.emit('postAction', createdObject);
  });
};

CrudController.prototype.putAction = function(id, obj, callback) {
  var self = this;
  obj = self.emberDataUnserialize(obj);
  try {
    if (id) {
      // use id if provided
      obj.id = id;
    }
    var query = self.buildQueryFromObject(obj);
    obj = self.cleanObject(obj);
    try {
      obj = self.prepareObject(obj, true);
    } catch (error) {
      return callback(new Error(error));
    }
    debug('putAction : searching item to update with citeria : ', obj);
    self.model.findOneAndUpdate(query, obj || {}, {
      new: true,
      upsert: true,
      sort: {
        _id: -1
      }
    }, function(err, createdObject) {
      if (err) {
        console.error('Error while updating object %j with query %s\n', obj, query || 'id:' + obj.id);
        debug('Could not update object ', obj, ' : ', err.message);
        if (callback) {
          return callback(err);
        }
      } else if (callback) {
        createdObject = self.emberDataSerialize(self.cleanObject(createdObject));
        callback(null, createdObject);
      }
      self.emit('putAction', createdObject);
    });
  } catch (err) {
    debug('Could not find object ', obj, ' : ', err.message);
    console.error("putAction error : ", err.message);
    err.message = "_id/id is not an valid object ID";
    if (callback) {
      return callback(err);
    }
  }
};

CrudController.prototype.deleteAction = function(id, params, callback) {
  var self = this,
    realId = null;
  try {
    realId = self.model.base.Types.ObjectId(id);
  } catch (err) {
    // id is not an object ID, let's try a query from parameters
    err.message = '_id/id is not an object ID.';
    if (callback) {
      callback(err);
    }
  }

  self.model.findByIdAndRemove(realId, function(err, foundObject) {
    if (foundObject === null) {
      debug('Can not find object type ', self.model.modelName, ' for id :', realId);
      err = new Error('Object not found for deletion : ' + realId);
    }
    if (err) {
      if (callback) {
        return callback(err);
      }
    } else {
      debug('Object id :', foundObject, ' removed for object type: ', self.model.modelName);
      if (callback) {
        foundObject = self.cleanObject(foundObject);
        callback(null, foundObject);
        self.emit('deleteAction', foundObject);
      }
    }
  });
};

CrudController.prototype.buildQueryFromObject = function(object) {
  var self = this,
    query = null,
    obj = JSON.parse(JSON.stringify(object)),
    customQueryCriteria = null;
  debug("Building Query from object : %j", obj);

  // handling limit parameter
  if (obj.limit) {
    delete(obj.limit);
  }

  // handling page parameter
  if (obj.page) {
    delete(obj.page);
  }

  // handling skip parameter
  if (obj.skip) {
    delete(obj.skip);
  }

  // if a custom query criteria is set, save it for later use
  // then drop it from the object
  if (obj.customQueryCriteria) {
    customQueryCriteria = obj.customQueryCriteria;
    delete(obj.customQueryCriteria);
  }
  if (obj._id || obj.id) {
    var id = self.model.base.Types.ObjectId(obj._id || obj.id);
    debug("Querying usind Id %s", id);
    query = self.model.findById(id);
  } else {
    var customQuery = {};
    // if a specific key is set for the model, use it
    // only if all the elements of the key is provided
    var keyOfQuery = _.intersection(self.queryKey, _.keys(obj));
    if (self.queryKey.length && _.isEqual(keyOfQuery, self.queryKey)) {
      // retrieving the properties which belongs to the key
      keyOfQuery.forEach(function(value) {
        customQuery[value] = obj[value];
      });
      debug("Filtering search with queryKey :%j", customQuery);
    } else {
      // overriding the default operator, if set
      if (self.querySearchOperatorOverride) {
        var regExp = null;
        // init customQuery
        customQuery = obj;
        // retrieving the keys whose operator should be overriden
        _.intersection(_.keys(self.querySearchOperatorOverride), _.keys(obj)).forEach(function(value) {
          switch (self.querySearchOperatorOverride[value]) {
            case "$regex":
              // text search case insensitive for mongo 2.4
              regExp = new RegExp(obj[value]);
              customQuery[value] = {
                "$regex": regExp,
                "$options": "i"
              };
              break;
          }
        });
        debug("Overriding operator : %j", customQuery);
      } else {
        // otherwise, the whole object is used, untouched
        customQuery = obj;
      }
    }
    // creating the query object, and saving the criteria already set
    query = self.model.find(customQuery).toConstructor();
    // now re-instantiante the customize query Object. Adding new criteria won't reset those set by default
    query = new query();
  }

  // query object is now set
  // add the optionnal custom criteria to the query
  if (customQueryCriteria) {
    debug("Adding custom criteria : ", customQueryCriteria);
    query = query.find(customQueryCriteria);
  }
  return query;
};

/**
 * Clean the objet, changing the _id key to id and removing _v mongoose's internal version field
 * @param  {[object]} obj [object to clean]
 * @return {[object]}     [cleaned object]
 */
CrudController.prototype.cleanObject = function(obj) {
  if (obj) {
    obj = JSON.parse(JSON.stringify(obj));
    delete(obj.__v);
    delete(obj.$inc);
    if (obj._id) {
      obj.id = obj._id;
      delete(obj._id);
    }
  }
  return obj;
};
/**
 * Prepare the object before insertion into database
 * @param {object} obj : object to prepare
 * @param {boolean} create : prepare object for creation if true
 * @returns {object}
 */
CrudController.prototype.prepareObject = function(obj, create) {
  return obj;
};
/**
 * Format data to be ember-data compatible
 * @param {data} : object [object/array to format]
 * @return {data/object} [ember-data compatible data]
 */
CrudController.prototype.emberDataSerialize = function(data) {
  var outputData = data;
  if (this.emberDataCompatible) {
    if (data instanceof Array) {
      outputData = {};
      outputData[this.model._collectionName] = data;
    } else if (data instanceof Object) {
      outputData = {};
      outputData[this.model._objectCollectionName] = data;
    }
  }
  return outputData;
};
/**
 * Retrieve data from ember-data
 * @param {data} : object [object/array to format]
 * @return {data/object} [ember-data compatible data]
 */
CrudController.prototype.emberDataUnserialize = function(data) {
  var inputData = data;
  if (this.emberDataCompatible) {
    if (data[this.model._collectionName]) {
      inputData = data[this.model._collectionName];
    } else if (data[this.model._objectCollectionName]) {
      inputData = data[this.model._objectCollectionName];
    }
  }
  return inputData;
};
module.exports = CrudController;