//apns-push.js
var debug = require('debug')('pushserver:apns-push'),
  apn = require('apn'),
  config = require('config').get('pushserver').get('apn'),
  mongoose = require('mongoose'),
  device = mongoose.model('devices'),
  util = require('util');

function ApnPushManager(app) {

  this.application = app;
  this.service = null;
  // clone the conf (kinda)
  this.connectionConf = JSON.parse(JSON.stringify(config.get('connection')));

  // Setup a connection to the feedback service 
  this.feedbackConf = JSON.parse(JSON.stringify(config.get('feedback')));
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
    var time, token,i;
    var now = new Date().getTime(); // UTC timestamp
    var limit = config.get('feedback').get('removeUserIfUnreachableSince') || 1296000; // limit specified or 15 days
    for (i in feedbackData) {

      time = feedbackData[i].time;
      token = feedbackData[i].device.toString("hex");
      debug("Device: " + token  + " for app " + this.application.name + "[" + this.application.type + "] has been unreachable, since: " + time );
      if ( (now - time) >= limit) {
        console.log("Removing device %s for app %s[%s]",token,this.application.name,this.application.type);
        device.findOneAndRemove({"token":token,"application":this.application.id},function(err,obj) {
          if (err) {
            console.error("Unable to remove Device from the database: %s[%s]",obj.token,this.application);
          }
        });
      }
    }
  };

  ApnPushManager.prototype.feedbackRun = function() {
    var self = this;
    debug('Openning feedback connection for ', this.application);
    debug('Using feedback connection options : ', this.feedbackConf);
    this.feedback = new apn.feedback(this.feedbackConf);  
    
    this.feedback.on('error', function(error) {
      console.error('Error while initializing the connection to the feedback platform for %s[%s] : %s', self.application.name, self.application.type, error);
    });

    this.feedback.on('feedback', function(feedbackData){self.handleFeedback(feedbackData);});
    this.feedback.on('feedbackError', console.error);
  };

  ApnPushManager.prototype.connect = function() {
    var self = this;
    if (this.application === null) {
      throw "ApnPushManager : an application object must be provided.";
    }

    debug('Openning connection for ', this.application);
    debug('Using connection options : ', this.connectionConf);
    // TODO : handling error like bad cert or key, etc.
    // where the error go ? 
    try {
      this.service = new apn.connection(this.connectionConf);
    } catch(err) {
      console.error("Unable to connect to APN for to %s[%s] : %s",self.application.name,self.application.type,err.message);
      throw err;
    }
    this.service.on('error', function(error) {
      console.error("Unable to connect to APN for to %s[%s] : %s",self.application.name,self.application.type,error);
    });

    this.service.on('connected', function() {
      console.log("Connected");
    });

    this.service.on('transmitted', function(notification, device) {
      debug("Notification transmitted to:" + device.token.toString('hex'));
    });

    this.service.on('transmissionError', function(errCode, notification, device) {
      debug("Notification caused error: " + errCode + " for device ", device, notification);
      if (errCode === 8) {
        debug("A error code of 8 indicates that the device token is invalid. This could be for a number of reasons - are you using the correct environment? i.e. Production vs. Sandbox");
      }
    });

    this.service.on('timeout', function() {
      console.error("Connection Timeout");
    });

    this.service.on('disconnected', function() {
      console.log("Disconnected from APNS");
    });

    this.service.on('socketError', console.error);
  };

  // If you plan on sending identical paylods to many devices you can do something like this.
  ApnPushManager.prototype.send = function(message, custom, tokens) {
    debug('Sending push with : message = %s message, custom = %j , num tokens = %d', message, custom, tokens.length);
    // connect to apple server, using the app's cred & key
    console.log("APNS : Sending %d tokens.",tokens.length);

    var note = new apn.notification(custom);
    note.setAlertText(message);
    note.setExpiry(Math.floor(Date.now() / 1000) + 3600); // Expires 1 hour from now.
    
    note.setBadge(1);
    note.sound = "default";
    this.service.pushNotification(note, tokens);
  };

  ApnPushManager.prototype.disconnect =function() {
    this.feedback.cancel();
    this.service.shutdown();
  };

  this.connect();
  this.feedbackRun();
}

module.exports = ApnPushManager;