//gcm-push.js
var debug = require('debug')('pushserver:gcm-push'),
  gcm = require('node-gcm'),
  config = require('config').get('pushserver').get('gcm'),
  mongoose = require('mongoose'),
  device = mongoose.model('devices'),
  _ = require('lodash');

var GCM_BULK_LIMIT = 1000;
/**
 * [GcmPushManager description]
 * @param {[type]} app [description]
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

    var connectionOptions = this.connectionConf,
      messageOptions = JSON.parse(JSON.stringify(config.get('messageOptions'))),
      push,bulkTokens;
      
    messageOptions.collapseKey = this.application.name;
    push = new gcm.Message(messageOptions)
    push.addDataWithObject(custom);

    debug("%d tokens to send.",tokens.length);

    // GCM limit the sending of 1000 tokens in bulk mode
    bulkTokens = _.chunk(tokens,GCM_BULK_LIMIT);
    for (i = 0; i < bulkTokens.length; i++) {
      console.log("GCM : Sending %d tokens in bulk-mode : part %d out of %d",bulkTokens[i].length,i+1,bulkTokens.length);
      //this.service.send(message,tokens,this.connectionConf.numRetries || 4, 
      this.service.sendNoRetry(push, bulkTokens[i], function(err, result) {
        if (err) {
          if (err === 401) {
            console.log("Invalid key provided for application " + self.application.name + ':' + self.application._id);
          } else {
            console.error("Error while sending push : ", err);
          }
        } else {
          // @FIXME : what shall we do with these ? 
          //console.log(result);
        }
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