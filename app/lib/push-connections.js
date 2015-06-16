//push-connexions.js
var mongoose = require('mongoose'),
  application = mongoose.model('applications'),
  ApnPushManager = require('./apns-push'),
  GcmPushManager = require('./gcm-push');

var util = require('util');

/*----------------------------------------------------
 * Handle connections for APNS & Google push service
 * One connection is opened per application
 *----------------------------------------------------*/

var PushConnections = function() {
  this.connections = [];
  var self = this;
  /**
   * [init description]
   * @return {[type]} [description]
   */
  PushConnections.prototype.init = function() {
    console.log("Init connections");
    application.find({}, function(err, applications) {
      if (err) {
        throw err;
      }
      applications.forEach(function(app, index) {
        self.setConnection(app);
      });
    });
  };
  /**
   * [setConnection description]
   * @param {[type]} app [description]
   */
  PushConnections.prototype.setConnection = function(app) {
    var appID = app._id || app.id;

    this.removeConnection(app);
    // dont connect enabled app
    if (app.enabled === true) {
      if (app.type === 'ios') {
        console.log('Adding connection to APNS for ', app.name);
        try {
          this.connections[appID] = new ApnPushManager(app);  
        } catch(err) {
          console.error("Unable to set connection to %s[%s] : %s",app.name,app.type,err.message);
        }
      } else if (app.type === 'android') {
        console.log('Adding connection to GCM for ', app.name);
        this.connections[appID] = new GcmPushManager(app);
      } else {
        console.error("Application type unknown.");
      }
    }
  };
  /**
   * [removeConnection description]
   * @param  {[type]} app [description]
   * @return {[type]}     [description]
   */
  PushConnections.prototype.removeConnection = function(app) {
    var appID = app._id || app.id;
    if (this.connections[appID]) {
      console.log('Removing connection to ' + app.name);
      this.connections[appID].disconnect();
      delete(this.connections[appID]);
    }
  };
  /**
   * [getConnection description]
   * @param  {[type]} appId [description]
   * @return {[type]}       [description]
   */
  PushConnections.prototype.getConnection = function(appId) {
    return self.connections[appId];
  };

  this.init();
};

module.exports = new PushConnections();