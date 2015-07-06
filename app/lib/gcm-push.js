//gcm-push.js
var debug = require('debug')('pushserver:gcm-push'),
  Promise = require('bluebird'),
  gcm = require('node-gcm'),
  mongoose = require("mongoose"),
  config = require('config').get('pushserver'),
  device = mongoose.model('devices'),
  _ = require('lodash');
Promise.promisifyAll(gcm.Sender.prototype);

var GCM_BULK_LIMIT = 1000,
  errorList = ["InvalidRegistration", "NotRegistered"];
/**
 * GcmPushManager
 * GCM push handler
 * @param {application object} app
 *
 * Application object : retrieve from ApplicationModel
 */
function GcmPushManager(app) {
  this.application = app;
  this.service = null;
  this.config = config.get('gcm');
  this.connectionConf = JSON.parse(JSON.stringify(this.config.get('connection')));

  /**
   * [connect description]
   * @return {[type]} [description]
   */
  GcmPushManager.prototype.connect = function() {
    debug('GCM : connecting to GCM platform using ', this.application);
    if (this.application === null) {
      throw "GcmPushManager : an application object must be provided.";
    }
    this.service = new gcm.Sender(this.application.key);
    debug('GCM : connection established using ', this.service);
  };
  /**
   * [send description]
   * @param  {[type]} message [description]
   * @param  {[type]} custom  [description]
   * @param  {[type]} tokens  [description]
   * @return {[type]}         [description]
   */
  GcmPushManager.prototype.send = function(message, custom, tokens) {

    var messageOptions = JSON.parse(JSON.stringify(this.config.get('messageOptions'))),
      push, bulkTokens,
      pGcmSend = [],
      self = this;

    messageOptions.collapseKey = this.application.name;
    push = new gcm.Message(messageOptions);
    push.addDataWithObject(custom);

    debug("GCM : %d tokens to send.", tokens.length);

    // GCM limit the sending of 1000 tokens in bulk mode
    bulkTokens = _.chunk(tokens, GCM_BULK_LIMIT);

    // processing the chunked array
    bulkTokens.map(function(chunk, index) {
      console.log("GCM : Sending %d tokens in chunk-mode : part %d out of %d", chunk.length, index + 1, bulkTokens.length);
      pGcmSend.push(
        self.service.sendAsync(push, chunk, self.connectionConf.numRetries || 4)
        .then(function(gcmResult) {
          debug("GCM : Processing results of chunk " + index + 1 + "/" + bulkTokens.length);
          var hasCanonical = false,
            hasError = false,
            tokensToProcess = [];
          debug("GCM : Results received from GCM platform :", gcmResult);
          hasCanonical = gcmResult.canonical_ids && (gcmResult.canonical_ids > 0);
          hasError = gcmResult.failure && (gcmResult.failure > 0);
          // handling error or canonical
          if (hasCanonical || hasError) {
            // create an array of object {token:token} and merge it with the gcmResult.results array
            tokensToProcess = tokensToProcess.concat(_.merge(
              _.map(chunk, function(item) {
                // building the object which will be processes by handleCanonicalIds
                return {
                  "token": item,
                  "hasCanonical": hasCanonical,
                  "hasError": hasError
                };
              }), gcmResult.results));
          }
          return tokensToProcess;
        })
        .catch(function(err) {
          if (err.message === "401") {
            console.error("GCM : Invalid key provided for application " + self.application.name + '[' + self.application.type + '] ID:' + self.application._id);
          } else {
            console.error(err.name + ":" + err.message);
          }
          return [];
        })
      );
    });
    // launching all asynchronous callbacks, waiting for them all
    Promise.all(pGcmSend).then(function(responses) {
      var tokensToProcess = [];
      // merging the responses, then handling them
      responses.forEach(function(items) {
        tokensToProcess = tokensToProcess.concat(items);
      });
      // processing the result array, using concurrency
      return Promise.map(tokensToProcess, function(token) {
        self.handleCanonicalIds(token);
      }, {
        "concurrency": config.get("dbConfig").get("concurrencyLimit")
      }).finally(function(){
        console.log("GCM : processing results done");
      });
    });
  };
  /**
   * Handle the response of GCM in order to :
   * - update the token in DB if a canonical Id is provided
   * - remove the token from DB if unregistered
   * @param token  {"token" : string,"hasCanonical" :boolean,"hasError" :boolean + <fields of GCM response>}
   * @return {[type]} [description]
   */
  GcmPushManager.prototype.handleCanonicalIds = function(token) {
    var self = this;
    // device
    if (token.hasCanonical && token.registration_id) {
      // update token in DB if canonical has not been already inserted
      device.findOneAsync({
        "token": token.registration_id,
        "application":self.application._id
      },{"token":1,"_id":0})
      .then(function(obj) {
          if (obj === null) {
            // no device found : update the token
            obj = {
              "token": token.registration_id
            };
            return device.findOneAndUpdateAsync({
                "token": token.token,
                "application":self.application._id
              }, obj)
              .then(function(obj) {
                if (obj === null) {
                  throw new Error("GCM : Unable to update device token " + token.token);
                }
                console.log("GCM : Updating device %s for app %s[%s] (canonical_id retrieved from gcm).", obj.token, self.application.name, self.application.type);
              }).catch(function(e) {
                console.error(e.name + " : " + e.message);
              });
          } else {
            // device with canonical_id found : the current device should be remove (it's basically the same device, but the GCM token has changed)
            // read https://developers.google.com/cloud-messaging/http#response
            return device.findOneAndRemoveAsync({
                "token": token.token,
                "application":self.application._id
              })
              .then(function(obj) {
                if (obj === null) {
                  throw new Error("GCM : Unable to remove device token " + token.token);
                } else {
                  console.log("GCM : Removing device %s for app %s[%s] - token already registered with canonical_id", token.token, self.application.name, self.application.type);
                }
              }).catch(function(e) {
                console.error(e.name + " : " + e.message);
              });
          }
        });
    } else if (token.hasError && token.error) {
      // if error message belongs to errorList, remove the device
      if (errorList.indexOf(token.error) >= 0) {
        // remove token from db
        device.findOneAndRemoveAsync({
          "token": token.token,
          "application":self.application._id
        }).then(function(obj) {
          if (obj === null) {
            throw new Error("GCM : Unable to remove device token " + token.token);
          } else {
            return console.log("GCM : Removing unregistered device %s for app %s[%s]", token.token, self.application.name, self.application.type);
          }
        }).catch(function(e) {
          console.error(e.name + " : " + e.message);
        });
      }
    }
  };
  /**
   * [disconnect description]
   * @return {[type]} [description]
   */
  GcmPushManager.prototype.disconnect = function() {
    console.log("GCM : Disconnected");
  };
  this.connect();
}

module.exports = GcmPushManager;