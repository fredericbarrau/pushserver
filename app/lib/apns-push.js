//apns-push.js
var debug = require('debug')('pushserver:apns-push'),
  Promise = require('bluebird'),
  mongoose = require('mongoose')
  apn = require('apn'),
  config = require('config').get('pushserver'),
  device = mongoose.model('devices'),
  util = require('util');

function ApnPushManager(app) {
  this.application = app;
  this.service = null;
  this.config = config.get('apn');
  // clone the conf (kinda)
  this.connectionConf = JSON.parse(JSON.stringify(this.config.get('connection')));
  // Setup a connection to the feedback service 
  this.feedbackConf = JSON.parse(JSON.stringify(this.config.get('feedback')));
  this.feedback = null;
  if (this.application.pfx && this.application.pfx !== "") {
    this.feedbackConf.pfx = this.application.pfx;
    this.connectionConf.pfx = this.application.pfx;
  }
  if (this.application.key && this.application.key !== "") {
    this.feedbackConf.key = this.application.key;
    this.connectionConf.key = this.application.key;
  }
  if (this.application.cert && this.application.cert !== "") {
    this.feedbackConf.cert = this.application.cert;
    this.connectionConf.cert = this.application.cert;
  }
  if (this.application.passphrase) {
    this.feedbackConf.passphrase = this.application.passphrase;
    this.connectionConf.passphrase = this.application.passphrase;
  }

  //-------------------------------------------------------------------------------------------------------
  // FEEDBACK Handling
  //-------------------------------------------------------------------------------------------------------

  ApnPushManager.prototype.handleFeedback = function(feedbackData) {
    var time, token, i,
      now = new Date().getTime(), // UTC timestamp
      limit = this.config.get('feedback').get('removeUserIfUnreachableSince') || 1296000, // limit specified or 15 days
      tokensToRemove = [],
      self = this;
    // building the token array to be removed
    for (i in feedbackData) {
      time = feedbackData[i].time;
      token = feedbackData[i].device.toString("hex");
      debug("APNS : Device: " + token + " for app " + this.application.name + "[" + this.application.type + "] has been unreachable, since: " + time);
      if ((now - time) >= limit) {
        tokensToRemove.push(token);
      }
    }
    debug("APNS : Feedback received for app %s[%s] : %j",self.application.name,self.application.type,tokensToRemove);
    // Use the array of promise to update the DB, using concurrency limit
    Promise.map(tokensToRemove, function(token) {
      return device.findOneAndRemoveAsync({
          "token": token,
          "application": self.application._id
        })
        .then(function(item) {
          if (item === null) {
            throw new Error("APNS : Unable to find device token " + token + " for app  " + self.application.name + "[" +  self.application.type + "]");
          }
          console.log("APNS : Removing device token %s for app %s[%s]", item.token, self.application.name, self.application.type);
          return item.token;
        })
        .catch(function(e) {
          // not really an error : token may have been already removed by a previous feedback
        });
    }, {
      "concurrency": config.get("dbConfig").get("concurrencyLimit") || 50
    }).then(function(item){
      if (item.length) {
        console.log("APNS : %d obsolete tokens have been removed for application %s[%s] .", item.length, self.application.name, self.application.type);  
      }
    });
  };

  ApnPushManager.prototype.feedbackRun = function() {
    var self = this;
    debug('APNS : Openning feedback connection for ', self.application);
    debug('APNS : Using feedback connection options : ', self.feedbackConf);
    self.feedback = new apn.feedback(self.feedbackConf);

    self.feedback.on('error', function(error) {
      console.error('APNS : Error while initializing the connection to the feedback platform for %s[%s] : %s', self.application.name, self.application.type, error);
    });

    self.feedback.on('feedback', function(feedbackData) {
      self.handleFeedback(feedbackData);
    });
    self.feedback.on('feedbackError', console.error);
  };

  ApnPushManager.prototype.connect = function() {
    var self = this;
    if (self.application === null) {
      throw "APNS : ApnPushManager : an application object must be provided.";
    }

    debug('APNS : Openning connection for ', self.application);
    debug('APNS : Using connection options : ', self.connectionConf);
    // TODO : handling error like bad cert or key, etc.
    // where the error go ? 
    try {
      self.service = new apn.connection(self.connectionConf);
    } catch (err) {
      console.error("APNS : Unable to connect for application %s[%s] : %s", self.application.name, self.application.type, err.message);
      throw err;
    }
    self.service.on('error', function(error) {
      console.error("APNS : Unable to connect to APN for application %s[%s] : %s", self.application.name, self.application.type, error);
    });

    self.service.on('transmitted', function(notification, device) {
      debug("APNS : Notification transmitted to:" + device.token.toString('hex'));
    });

    self.service.on('transmissionError', function(errCode, notification, device) {
      debug("APNS : Notification caused error: " + errCode + " for device ", device, notification);
      if (errCode === 8) {
        debug("APNS : A error code of 8 indicates that the device token is invalid. This could be for a number of reasons - are you using the correct environment? i.e. Production vs. Sandbox");
      }
    });

    /*
     * Happens all the time, not really usefull to log these
     *
     this.service.on('connected', function() {
      console.log("APNS : Connected");
    });
    this.service.on('disconnected', function() {
      console.log("APNS : Disconnected from APNS");
    });
    */
     self.service.on('timeout', function() {
      console.error("APNS : Connection Timeout");
    });

    self.service.on('socketError', console.error);
  };

  // If you plan on sending identical paylods to many devices you can do something like this.
  ApnPushManager.prototype.send = function(message, custom, tokens) {
    debug('APNS : Sending push with : message = %s message, custom = %j , num tokens = %d', message, custom, tokens.length);
    // connect to apple server, using the app's cred & key
    console.log("APNS : Sending %d tokens.", tokens.length);

    var note = new apn.notification(custom);
    note.setAlertText(message);
    note.setExpiry(Math.floor(Date.now() / 1000) + 3600); // Expires 1 hour from now.

    note.setBadge(1);
    note.sound = "default";
    this.service.pushNotification(note, tokens);
  };

  ApnPushManager.prototype.disconnect = function() {
    this.feedback.cancel();
    this.service.shutdown();
  };

  this.connect();
  this.feedbackRun();
}

module.exports = ApnPushManager;