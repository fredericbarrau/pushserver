var superagent = require('superagent'),
  _ = require('lodash'),
  mongoose = require('mongoose'),
  db = require('../app/models/mongoose-connect');
sampleData = require('./data/sample-data'); // loading test data

// temp var
var currentApp = {},
  currentTarget = {},
  currentDevice = {},
  testApps = [];

function checkAppProp(app) {
  app.should.have.property("id");
  app.should.have.property("name");
  app.should.have.property("type");
  app.should.have.property("key");
  app.should.have.property("cert");
}

function checkTargetProp(app) {
  app.should.have.property("id");
  app.should.have.property("name");
  app.should.have.property("description");
  app.should.have.property("applications");
}

function checkDeviceProp(app) {
  app.should.have.property("id");
  app.should.have.property("name");
  app.should.have.property("type");
  app.should.have.property("token");
  app.should.have.property("application");
}

/**
 * Test for Rest API
 * @return {[type]} [description]
 */
describe('Rest API', function() {

  // dropping test data 
  after(function(done) {
    mongoose.connection.db.dropDatabase(function() {
      done();
    });
  });

  /**
   * Applications API
   * @return {[type]} [description]
   */
  describe('[APPLICATIONS] Rest API', function() {
    var currentApp = {};

    describe("#/api/applications/application", function() {
      it("- should validate POST content-type", function(done) {
        superagent.post(global.serverUrl + '/api/applications/application')
          .type("text/plain")
          .send("Test string")
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(406);
              done();
            }
          });
      });
      it("- should validate PUT content-type", function(done) {
        superagent.put(global.serverUrl + '/api/applications/application')
          .type("text/plain")
          .send("Test string")
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(406);
              done();
            }
          });
      });

      it("- should POST application", function(done) {
        superagent.post(global.serverUrl + '/api/applications')
          .type('application/json')
          .send(sampleData.applications[0])
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(201);
              checkAppProp(res.body);
              currentApp = res.body;
              done();
            }
          });
      });
      it("- should VALIDATE posted application", function(done) {
        // 3rd application is a falsy app
        superagent.post(global.serverUrl + '/api/applications')
          .type('application/json')
          .send(sampleData.applications[3])
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(400);
              done();
            }
          });
      });

      /**
       * get an object using its ID
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should GET application using ID", function(done) {
        superagent.get(global.serverUrl + '/api/applications/application/' + currentApp.id)
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(200);
              checkAppProp(res.body);
              done();
            }
          });
      });
      it("- should return a 404 when a bad ID is provided with GET", function(done) {
        superagent.get(global.serverUrl + '/api/applications/application/UNKNOWN-APPLICATION')
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(404);
              done();
            }
          });
      });

      /**
       * [put with an object containing an ID]
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should PUT (update) application with id query ", function(done) {
        currentApp.name = 'Updated Name of the app 1';
        superagent.put(global.serverUrl + '/api/applications/application/')
          .type('application/json')
          .send(currentApp)
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(201);
              checkAppProp(res.body);
              res.body.id.should.equal(currentApp.id);
              done();
            }
          });
      });
      /**
       * [no ID in the object to update, model will use the other field to find the object to update]
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should PUT (update) application with custom criteria", function(done) {
        // adding an app
        currentApp.description = "Changing the description";
        // no id for retrieving the app
        delete(currentApp.id);
        superagent.put(global.serverUrl + '/api/applications/application/')
          .type('application/json')
          .send(currentApp)
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(201);
              checkAppProp(res.body);
              done();
            }
          });
      });
      /**
       * [If object is not found in the DB, it shall create it]
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should PUT (create) application if not exists ", function(done) {
        superagent.put(global.serverUrl + '/api/applications/application')
          .type('application/json')
          .send(sampleData.applications[1])
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(201);
              checkAppProp(res.body);
              // initialize currentApp for next tests
              // current App = sampleData.applications[1] now
              currentApp = res.body;
              done();
            }
          });
      });
      /**
       * Retrieving a collection of previously inserted objects
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should GET application collection", function(done) {
        superagent.get(global.serverUrl + '/api/applications')
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(200);
              res.body.length.should.be.ok.and.be.exactly(2);
              done();
            }
          });
      });
      /**
       * Retrieving a collection of previously inserted objects with limit
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should GET application collection (with limit)", function(done) {
        superagent.get(global.serverUrl + '/api/applications?limit=1')
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(200);
              res.body.length.should.be.ok.and.be.exactly(1);
              done();
            }
          });
      });
      /**
       * Retrieving a collection of previously inserted objects with limit and offset
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should GET application collection (with limit and page)", function(done) {
        superagent.get(global.serverUrl + '/api/applications?limit=1&page=1')
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(200);
              res.body.length.should.be.ok.and.be.exactly(1);
              checkAppProp(res.body[0]);
              done();
            }
          });
      });
      /**
       * Deleting an object using its ID
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should DELETE application", function(done) {
        superagent.del(global.serverUrl + '/api/applications/application/' + currentApp.id)
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(200);
              checkAppProp(res.body);
              done();
            }
          });
      });
      it("- should SEARCH application");
      it("- should SEARCH application using customCriteria");
    });
  });

  /**
   * Targets API
   * @return {[type]} [description]
   */
  describe('[TARGETS] Rest API', function() {
    // retrieving apps for target tests
    before(function(done) {
      // adding a few apps, then getting the collection
      superagent.post(global.serverUrl + '/api/applications/application')
        .type('application/json')
        .send(sampleData.applications[1])
        .end();
      superagent.post(global.serverUrl + '/api/applications/application')
        .type('application/json')
        .send(sampleData.applications[2])
        .end();

      superagent.get(global.serverUrl + '/api/applications')
        .send()
        .end(function(err, res) {
          testApps = res.body;
          //console.log(testApps);
          done();
        });
    });

    describe("#/api/targets/target", function() {
      it("- should validate POST content-type", function(done) {
        superagent.post(global.serverUrl + '/api/targets/target')
          .type("text/plain")
          .send("Test string")
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(406);
              done();
            }
          });
      });
      it("- should validate PUT content-type", function(done) {
        superagent.put(global.serverUrl + '/api/targets/target')
          .type("text/plain")
          .send("Test string")
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(406);
              done();
            }
          });
      });
      it("- should POST target", function(done) {
        // adding last inserted application to target
        sampleData.targets[0].applications.push(testApps[0].id);
        sampleData.targets[1].applications.push(testApps[1].id);

        superagent.post(global.serverUrl + '/api/targets')
          .type('application/json')
          .send(sampleData.targets[0])
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(201);
              checkTargetProp(res.body);
              // init currentTarget for later use
              currentTarget = res.body;
              done();
            }
          });
      });
      /**
       * get an object using its ID
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should GET target using ID", function(done) {
        superagent.get(global.serverUrl + '/api/targets/target/' + currentTarget.id)
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(200);
              checkTargetProp(res.body);
              done();
            }
          });
      });
      it("- should return a 404 when a bad ID is provided with GET", function(done) {
        superagent.get(global.serverUrl + '/api/targets/target/UNKNOWN-APPLICATION')
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(404);
              done();
            }
          });
      });

      /**
       * [put with an object containing an ID]
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should PUT (update) target with id query ", function(done) {
        currentTarget.name = 'Updated Name of the target';
        superagent.put(global.serverUrl + '/api/targets/target/')
          .type('application/json')
          .send(currentTarget)
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              // console.log(res.body);
              res.statusCode.should.equal(201);
              checkTargetProp(res.body);
              done();
            }
          });
      });
      /**
       * [put a target containing an ID and empty applications array - issue#17]
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should PUT (update) target with id query and an empty app array", function(done) {
        currentTarget.name = 'Updated Name of the target again';
        currentTarget.applications = [];
        superagent.put(global.serverUrl + '/api/targets/target/')
          .type('application/json')
          .send(currentTarget)
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              // console.log(res.body);
              res.statusCode.should.equal(201);
              checkTargetProp(res.body);
              res.body.applications.should.be.instanceof(Array).and.have.length(0);
              done();
            }
          });
      });      
      /**
       * [no ID in the object to update, model will use the other field to find the object to update]
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should PUT (update) target with custom criteria", function(done) {
        currentTarget.description = 'Updated Description of the target 2';
        // no ID for retrieving the target
        delete(currentTarget.id);

        superagent.put(global.serverUrl + '/api/targets/target/')
          .type('application/json')
          .send(currentTarget)
          .end(function(err, res) {
            if (err) {
              // console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(201);
              checkTargetProp(res.body);
              done();
            }
          });
      });
      /**
       * [If object is not found in the DB, it shall create it]
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should PUT (create) target if not exists ", function(done) {
        // adding last inserted application to target
        sampleData.targets[1].applications.push(testApps[0].id);

        superagent.put(global.serverUrl + '/api/targets/target')
          .type('application/json')
          .send(sampleData.targets[1])
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              // console.log(res.body);
              res.statusCode.should.equal(201);
              checkTargetProp(res.body);
              //setting the current Target with the updated one
              currentTarget = res.body;
              done();
            }
          });
      });
      /**
       * Retrieving a collection of previously inserted objects
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should GET target collection", function(done) {
        superagent.get(global.serverUrl + '/api/targets')
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(200);
              res.body.length.should.be.ok.and.be.exactly(2);
              done();
            }
          });
      });
      /**
       * Retrieving a collection of previously inserted objects with limit
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should GET target collection (with limit)", function(done) {
        superagent.get(global.serverUrl + '/api/targets?limit=1')
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(200);
              res.body.length.should.be.ok.and.be.exactly(1);
              done();
            }
          });
      });
      /**
       * Retrieving a collection of previously inserted objects with limit and page
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should GET target collection (with limit and page)", function(done) {
        superagent.get(global.serverUrl + '/api/targets?limit=1&page=1')
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(200);
              res.body.length.should.be.ok.and.be.exactly(1);
              done();
            }
          });
      });
      /**
       * Deleting an object using its ID
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should DELETE target", function(done) {
        superagent.del(global.serverUrl + '/api/targets/target/' + currentTarget.id)
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(200);
              checkTargetProp(res.body);
              done();
            }
          });
      });
      it("- should SEARCH target");
      it("- should SEARCH target using customCriteria");
    });
  });

  /**
   * Devices API
   * @return {[type]} [description]
   */
  describe('[DEVICES] Rest API', function() {
    describe("#/api/devices/device", function() {
      it("- should validate POST content-type", function(done) {
        superagent.post(global.serverUrl + '/api/devices/device')
          .type("text/plain")
          .send("Test string")
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(406);
              done();
            }
          });
      });
      it("- should validate PUT content-type", function(done) {
        superagent.put(global.serverUrl + '/api/devices/devices')
          .type("text/plain")
          .send("Test string")
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(406);
              done();
            }
          });
      });
      it("- should POST device", function(done) {
        // adding last inserted application to device
        sampleData.devices[0].application = testApps[0].id;
        superagent.post(global.serverUrl + '/api/devices')
          .type('application/json')
          .send(sampleData.devices[0])
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(201);
              checkDeviceProp(res.body);
              // init currentDevice for later use
              currentDevice = res.body;
              done();
            }
          });
      });
      it("- should POST device with custom data", function(done) {
        var newDevice = sampleData.devices[1];
        // adding last inserted application to device
        newDevice.application = testApps[0].id;
        // adding custom data
        newDevice.customData1 = {
          "data1": "custom1"
        };
        newDevice.customData2 = {
          "data2": "custom2"
        };
        superagent.post(global.serverUrl + '/api/devices')
          .type('application/json')
          .send(newDevice)
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(201);
              checkDeviceProp(res.body);
              // init currentDevice for later use
              currentDevice = res.body;
              done();
            }
          });
      });
      /**
       * get an object using its ID
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should GET device using ID", function(done) {
        superagent.get(global.serverUrl + '/api/devices/device/' + currentDevice.id)
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(200);
              checkDeviceProp(res.body);
              done();
            }
          });
      });
      it("- should return a 404 when a bad ID is provided with GET", function(done) {
        superagent.get(global.serverUrl + '/api/devices/device/UNKNOWN-STUFF')
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(404);
              done();
            }
          });
      });
      /**
       * [put with an object containing an ID]
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should PUT (update) device with id query ", function(done) {
        currentDevice.name = 'Updated Name of the device';

        superagent.put(global.serverUrl + '/api/devices/device/')
          .type('application/json')
          .send(currentDevice)
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              // console.log(res.body);
              res.statusCode.should.equal(201);
              checkDeviceProp(res.body);
              done();
            }
          });
      });
      /**
       * [no ID in the object to update, model will use the other field to find the object to update]
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should PUT (update) device with custom criteria", function(done) {
        currentDevice.name = 'Updated Name of the device 2';
        // no ID for founding the device
        delete(currentDevice.id);
        superagent.put(global.serverUrl + '/api/devices/device/')
          .type('application/json')
          .send(currentDevice)
          .end(function(err, res) {
            if (err) {
              // console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(201);
              checkDeviceProp(res.body);
              done();
            }
          });
      });
      /**
       * [If object is not found in the DB, it shall create it]
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should PUT (create) device if not exists ", function(done) {
        // adding last inserted application to device
        sampleData.devices[2].application = testApps[1].id;
        superagent.put(global.serverUrl + '/api/devices/device')
          .type('application/json')
          .send(sampleData.devices[2])
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              //console.log(res.body);
              res.statusCode.should.equal(201);
              checkDeviceProp(res.body);
              // setting the current device with the updated one
              currentDevice = res.body;
              done();
            }
          });
      });
      /**
       * Retrieving a collection of previously inserted objects
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should GET devices collection", function(done) {
        superagent.get(global.serverUrl + '/api/devices')
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(200);
              res.body.length.should.be.ok.and.be.exactly(3);
              done();
            }
          });
      });
      /**
       * Retrieving a collection of previously inserted objects with limit
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should GET devices collection (with limit)", function(done) {
        superagent.get(global.serverUrl + '/api/devices?limit=2')
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(200);
              res.body.length.should.be.ok.and.be.exactly(2);
              done();
            }
          });
      });
      /**
       * Retrieving a collection of previously inserted objects with limit and page
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should GET devices collection (with limit and page)", function(done) {
        superagent.get(global.serverUrl + '/api/devices?limit=2&page=2')
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(200);
              res.body.length.should.be.ok.and.be.exactly(1);
              done();
            }
          });
      });
      /**
       * Deleting an object using its ID
       * @param  {Function} done [description]
       * @return {[type]}        [description]
       */
      it("- should DELETE device", function(done) {
        superagent.del(global.serverUrl + '/api/devices/device/' + currentDevice.id)
          .send()
          .end(function(err, res) {
            if (err) {
              console.error(err.message);
              done(err);
            } else {
              res.statusCode.should.equal(200);
              checkDeviceProp(res.body);
              done();
            }
          });
      });
      it("- should SEARCH device");
      it("- should SEARCH device using customCriteria");
    });
  });
});