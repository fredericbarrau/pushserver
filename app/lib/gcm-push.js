//gcm-push.js
var debug = require('debug')('pushserver:gcm-push'),
gcm = require('node-gcm'),
config = require('config').get('pushserver').get('gcm'),
mongoose = require('mongoose'),
device = mongoose.model('devices'),
_ = require('lodash');

var GCM_BULK_LIMIT = 1000;
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
  this.connectionConf = JSON.parse(JSON.stringify(config.get('connection')));
  var self = this;

  /**
   * [connect description]
   * @return {[type]} [description]
   */
   GcmPushManager.prototype.connect = function() {
    debug('connecting to GCM platform using ', this.application);
    if (this.application === null) {
      throw "GcmPushManager : an application object must be provided.";
    }
    this.service = new gcm.Sender(this.application.key);
    debug('connection established to GCM using ', this.service);
  };
  /**
   * [send description]
   * @param  {[type]} message [description]
   * @param  {[type]} custom  [description]
   * @param  {[type]} tokens  [description]
   * @return {[type]}         [description]
   */
   GcmPushManager.prototype.send = function(message, custom, tokens) {
    var messageOptions = JSON.parse(JSON.stringify(config.get('messageOptions'))),
    push,bulkTokens,i=0;

    messageOptions.collapseKey = this.application.name;
    push = new gcm.Message(messageOptions);
    push.addDataWithObject(custom);

    debug("%d tokens to send.",tokens.length);

    // GCM limit the sending of 1000 tokens in bulk mode
    bulkTokens = _.chunk(tokens,GCM_BULK_LIMIT);
    for (i = 0; i < bulkTokens.length; i++) {
      console.log("GCM : Sending %d tokens in bulk-mode : part %d out of %d",bulkTokens[i].length,i+1,bulkTokens.length);
      this.service.send(push,bulkTokens[i],this.connectionConf.numRetries || 4, function(err, gcmResult) {
        if (err) {
          if (err === 401) {
            console.log("Invalid key provided for application " + self.application.name + ':' + self.application._id);
          } else {
            console.error("Error while sending push : ", err);
          }
        } else {
          debug("Result recieved from GCM platform:",gcmResult);
          var hasCanonical = false, hasError =false;
          hasCanonical = gcmResult.canonical_ids && (gcmResult.canonical_ids > 0);
          hasError = gcmResult.failure && (gcmResult.failure > 0);
          // handling error or canonical
          if (hasCanonical || hasError) {
            // create an array of object {token:token} and merge it with the gcmResult.results array
            _.merge(_.map(tokens,function(item){return {"token":item};}),gcmResult.results).forEach(function(item){
              self.handleCanonicalIds(item,hasCanonical,hasError);
            });
          } 
        }
      });
    }
  };
  /**
   * Handle the response of GCM in order to :
   * - update the token in DB if a canonical Id is provided
   * - remove the token from DB if unregistered
   * @return {[type]} [description]
   */
  GcmPushManager.prototype.handleCanonicalIds = function(token, hasCanonical, hasError) {
    // device
    if (hasCanonical && token.registration_id) {
      // update token in DB if canonical has not been already inserted
      device.findOne({"token":token.registration_id},function(err,obj) {
        if (err || ! obj ) {
          // no device found : update the token
          obj = {"token" : token.registration_id};
          device.findOneAndUpdate({"token":token.token}, obj, function(err,item) {
            if (err) {
              return console.error("Unable to find device token %s",token.token);
            }
            console.log("Android device %j updated (canonical_id retrieved from gcm).", item);
          });
        } else {
          // device with canonical_id found : the current device should be remove (it's basically the same device, but the GCM token has changed)
          // read https://developers.google.com/cloud-messaging/http#response
          device.findOneAndRemove({"token":token.token},function(err, item) {
            if (err) {
              return console.error("Unable to find device token %s",token.token);
            }
            console.log("Android device %j removed (token has changed and canonical_id already in DB).", item);
          });
        }
      });
    } else if (hasError && token.error && token.error ===  "NotRegistered") {
      // device is not registered any more : remove token from db
      device.findOneAndRemove({"token":token.token},function(err, item) {
        if (err) {
          return console.error("Unable to find device token %s",token.token);
        }
        console.log("Android device %j removed (unregistered).", item);
      });
    }
  };
  /**
   * [disconnect description]
   * @return {[type]} [description]
   */
   GcmPushManager.prototype.disconnect = function() {
    console.log("Disconnected from GCM");
  };

  this.connect();
}

module.exports = GcmPushManager;