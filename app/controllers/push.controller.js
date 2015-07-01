"use strict";
//push.controller.js
var debug = require('debug')('pushserver:push.controller'),
  CrudController = require('./crud.controller'),
  db = require('../models/mongoose-connect'),
  _ = require('lodash'),
  pushConnections = require('./../lib/push-connections'),
  util = require('util');
/**
 * Crud Controller for push
 * Extend CrudController
 *
 * Override postAction for sending push after the DB insertion
 *
 * @param {object} mongooseModel : the push DB model
 * @param {object} pushCon : the push connection to send the push with
 * @returns {PushController}
 */
var PushController = function(mongooseModel, pushCon) {
  CrudController.call(this);
  this.model = mongooseModel;
  this.pushConnections = pushCon;
  this.queryDefaultSort = {
    "created.t": -1
  };
  /**
   * @type PushController
   */
  var self = this;

  /**
   * simulateAction : simulate the push action
   * Does not send any push, returns the tokens which would have been sent
   * @param {object} push object
   * @param {function} callback
   * @returns Array of tokens
   */

  PushController.prototype.simulateAction = function(obj, callback) {
    try {
      obj = self.prepareObject(obj, true);
    } catch (error) {
      return callback(new Error(error));
    }
    self.sendPush(obj, function(err, pushObj, payload, tokens) {
      if (err) {
        console.error("Unable to simulate the sending of push for obj %j  : %s", pushObj, err.message);
        return callback(err);
      }
      console.log("Simulated push %j would be send to tokens : ", pushObj, tokens);
      return callback(null, tokens);

    });
  };

  PushController.prototype.queryDevicesToPush = function(deviceQuery, pushObj, callback) {
    // saving query for device
    var Device = db.models.device.find(deviceQuery, {"token":1,"_id":0}).toConstructor(),
      device = new Device(),
      customCriteria = {};
    try {
      // further filtering using the customCriteria, if any
      if (typeof pushObj.customCriteria === "string" && pushObj.customCriteria !== "") {
        customCriteria = JSON.parse(pushObj.customCriteria);
      }
      device = device.find(customCriteria || {});

      //querying the model
      device.exec(function(err, dev) {
        if (err) {
          return callback(err);
        }
        if (dev.length === 0) {
          return callback(new Error("No device to send the push to."));
        }
        // flattening the token array
        var tokens = _.pluck(dev, 'token');
        return callback(null, tokens);

      });
    } catch (err) {
      return callback(new Error("Invalid custom criteria : not JSON"));
    }
  };
  /**
   * Callback which perform push send to the tokens
   * @param {type} err
   * @param {object} pushObj : a push object
   * @param {object} payload
   * @param {array} tokens
   * @returns {undefined}
   */
  PushController.prototype.performSendPushCallback = function(err, pushObj, payload, tokensCollection) {
    var tokens, application, query, conn, senderCollection = {},
      counter = 0;

    if (!err) {
      // Two step loop to avoid a callback race condition for updating the push record
      // loop for retrieving the service connection and filtering the disabled app
      tokensCollection.forEach(function(item, index) {
        debug("Target mode : handling application %s",item.application);
        // checking if app is enabled
        db.models.application.findById(item.application, function(err, obj) {
          if (err) {
            console.error("Application %s not found", obj._id);
            return;
          }
          debug("Target mode : application %s found in DB",obj._id);
          // sending to enabled app only
          if (obj.enabled === true) {
            debug("Target mode : application %s is enabled : adding it to the push spool",obj._id);
            // adding the connection to the collection
            senderCollection[obj._id] = {
              "connection": self.pushConnections.getConnection(obj._id),
              "tokens": item.tokens
            };

            // setting the number of tokens for the stats object in pushObj
            pushObj.stats.push({
              application: obj._id,
              device: pushObj.device || '',
              //submittedTokens: item.tokens,
              tokensCount: item.tokens.length
            });
            debug("Target mode : push spool : %j", _.keys(senderCollection));
          } else {
            console.log("Application ID %s (%s:%s) is disabled : no notification will be send to this app.", obj._id,obj.name,obj.type);
          }

          if (++counter === tokensCollection.length) {
            (function(){
              // save the submitted tokens in the DB
              query = self.buildQueryFromObject(pushObj);
              // updating push record (done here to avoid race condition with the connection which update the push record as well)
              pushObj = self.cleanObject(pushObj);
              self.model.findOneAndUpdate(query, pushObj, {
                new: false,
                sort: {
                  _id: -1
                }
              }, function(err, createdObject) {});
              // second loop : the sending
              for (application in senderCollection) {
                console.log("Sending pushes to app %s. %d tokens submitted", application, senderCollection[application].tokens.length);
                debug("Token submitted :", senderCollection[application].tokens);
                senderCollection[application].connection.send(payload.message, payload, senderCollection[application].tokens);
              }
            })(this);
          }
        });
      });
    }
  };
  /**
   * Handle the different types of sending : by app, by device, by target
   * @param {type} pushObj
   * @param {type} callback
   * @returns {unresolved}
   */
  PushController.prototype.sendPush = function(pushObj, callback) {
    var pushTokens = [];
    //handling push
    debug('Sending pushObject :', pushObj);

    // creating the correct payload 
    var payload = self.payloadify(pushObj.payload);
    if (pushObj.target) {
      console.log("Submitting push to TARGET %s", pushObj.target);
      var target = db.models.target,
        counter = 0;
      target.findById(pushObj.target, function(err, foundTarget) {
        if (err) {
          console.error("Error while finding target ", err.message);
          return callback(err);
        }
        if (foundTarget ===null) {
          console.error("Target %s not found", pushObj.target);
          return callback(new Error("Target not found :", pushObj.target));
        }
        pushTokens = [];
        foundTarget.applications.forEach(function(app, index, arrayOfApp) {
          console.log("TARGET - APP ID:%s", app);
          self.queryDevicesToPush({
            application: app
          }, pushObj, function(err, tokens) {
            // concatenate the tokens, and send them in the end
            if (tokens) {
              pushTokens.push({
                "application": app,
                "tokens": tokens,
                "tokensCount": tokens.length
              });
            }
            // send all the tokens once all the apps
            // have been handled
            if (++counter === arrayOfApp.length) {
              callback(null, pushObj, payload, pushTokens);
            }
          });
        });
      });
    } else if (pushObj.device && pushObj.application) {
      console.log("Submitting push to DEVICE %s[%s]", pushObj.device, pushObj.application);
      // sending to a single device
      // retrieve the connection for this app from the pool of connections
      self.queryDevicesToPush({
        _id: pushObj.device,
        application: pushObj.application
      }, pushObj, function(err, tokens) {
        if (err) {
          console.error("Error while searching for device to send the push to. %j : %s", pushObj, err.message);
          return callback(err);
        }
        pushTokens = [{
          "application": pushObj.application,
          "tokens": tokens,
          "tokensCount": tokens.length
        }];
        return callback(null, pushObj, payload, pushTokens);

      });
    } else if (pushObj.application) {
      console.log("Submitting push to APPLICATION %s", pushObj.application);
      self.queryDevicesToPush({
        application: pushObj.application
      }, pushObj, function(err, tokens) {
        if (err) {
          console.error("Error while sending push : " + err.message);
          return callback(err);
        }
        pushTokens = [{
          "application": pushObj.application,
          "tokens": tokens,
          "tokensCount": tokens.length
        }];
        return callback(null, pushObj, payload, pushTokens);
      });
    } else {
      var err = new Error("Incorrect push submitted " + pushObj);
      return callback(err);
    }
  };

  PushController.prototype.payloadify = function(payload) {
    var rPayload = {
      message: payload
    };
    if (typeof payload === "string") {
      try {
        rPayload = JSON.parse(payload);
      } catch (ignore) {}
    }
    return rPayload;
  };
  /**
   *
   * @param {object} obj
   * @param {boolean} create : true if object is created
   * @returns {unresolved}
   */
  PushController.prototype.prepareObject = function(obj, create) {
    if (typeof obj.payload === "object") {
      try {
        obj.payload = JSON.stringify(obj.payload);
      } catch (err) {
        throw "Payload as an object must be serializable.";
      }
    } else if (typeof obj.payload === "string") {
      try {
        JSON.parse(obj.payload);
      } catch (err) {
        throw "Payload as a string must be a valid JSON object stringified.";
      }
    } else {
      throw "Payload must be a valid JSON object stringified or a valid JSON Object. Send : " + (typeof obj.payload) + ".";
    }
    // adding creation date
    var now = new Date();
    if (create) {
      obj.created = {
        "date": now,
        "t": now.getTime()
      };
      obj.send = false;
    }
    return obj;
  };
};
util.inherits(PushController, CrudController);

var pushController = new PushController(db.models.push, pushConnections);

// send the push after creating it
pushController.addListener('postAction', function(pushObject) {
  console.log('Push send : %j', pushObject);
  pushController.sendPush(pushObject, pushController.performSendPushCallback);
});

module.exports = pushController;