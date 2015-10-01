"use strict";
var superagent = require('superagent'),
  sampleData = require('./data/sample-data'),
  db = require('../app/models/mongoose-connect');

// sample data 
var sampleDevices = [],
  sampleApplications = [],
  sampleTarget = {};

describe("Push API", function() {
  // loading sample data for app & devices
  before(function(done) {
    superagent.post(global.serverUrl + "/api/applications")
      .type('application/json')
      .send(sampleData.applications[0])
      .end(function(res) {
        sampleApplications.push(res.body);
        // creating another app
        superagent.post(global.serverUrl + "/api/applications")
          .type('application/json')
          .send(sampleData.applications[4])
          .end(function(err, res) {
            sampleApplications.push(res.body);
            // creating a target from this app, and the previously loaded
            superagent.post(global.serverUrl + "/api/targets")
              .type('application/json')
              .send({
                "name": "Test Target",
                "applications": [sampleApplications[0].id, sampleApplications[1].id]
              })
              .end(function(res) {
                // loading devices for the previously loaded apps
                var last = sampleData.devices.length * 2,
                  current = 0;
                sampleApplications.forEach(function(app, index) {
                  sampleData.devices.forEach(function(item) {
                    item.application = app.id;
                    superagent.post(global.serverUrl + "/api/devices")
                      .type('application/json')
                      .send(item)
                      .end(function(req) {
                        // passing through when all is loaded
                        current++;
                        //console.log("%d/%d", current,last);
                        if (current >= last) {
                          done();
                        }
                      });
                  });
                });
              });
          });
      });
  });

  // dropping test data 
  after(function(done) {
    db.models.application.remove({}, function() {
      db.models.device.remove({}, function() {
        db.models.target.remove({}, function() {
          done();
        });
      });
    });
  });
  it("- should validate POST content-type", function(done) {
    
    superagent.post(global.serverUrl + '/api/pushes/push')
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

    superagent.put(global.serverUrl + '/api/pushes/push')
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

  it("- should have target loaded", function(done) {
    superagent.get(global.serverUrl + "/api/targets")
      .send()
      .end(function(err, res) {
        if (err) {
          console.error(err.message);
          done(err);
        } else {
          res.statusCode.should.equal(200);
          res.body.length.should.equal(1);
          sampleTarget = res.body[0];
          done();
        }
      });
  });

  it("- should have application loaded", function(done) {
    superagent.get(global.serverUrl + "/api/applications")
      .send()
      .end(function(err, res) {
        if (err) {
          console.error(err.message);
          done(err);
        } else {
          res.statusCode.should.equal(200);
          res.body.length.should.equal(2);
          done();
        }
      });
  });
  it("- should have devices loaded", function(done) {
    // more than 10 devices loaded (the limit) : disabling limit
    superagent.get(global.serverUrl + "/api/devices?limit=0")
      .send()
      .end(function(err, res) {
        if (err) {
          console.error(err.message);
          done(err);
        } else {
          res.statusCode.should.equal(200);
          res.body.length.should.equal(sampleData.devices.length * 2);
          // save the devices for further use
          sampleDevices = res.body;
          done();
        }
      });
  });

  it("- should simulate a DEVICE push", function(done) {
    // simulate a push to a single device token
    var testPush = {
      "device": sampleDevices[0].id,
      "payload": {
        "message": "a simple message"
      },
      "application": sampleDevices[0].application,
      "simulate": true
    };

    superagent.post(global.serverUrl + "/api/pushes")
      .type('application/json')
      .send(testPush)
      .end(function(err, res) {
        // should return the tokens to send the push to: the current one 
        res.statusCode.should.equal(201);
       
        // simulation returns the tokens of the device targetted by the push
        // here 1 device 
        res.body.should.be.instanceOf(Array);
        res.body.length.should.equal(1);
        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(1);
        res.body[0].should.have.property("application");
        res.body[0].application.should.equal(sampleDevices[0].application);
        done();
      });
  });
  it.skip("- should simulate a DEVICE push with customCriteria", function(done) {
    // not relevent
  });
  it("- should simulate an APPLICATION push", function(done) {
    // simulate a push to an application
    var testPush = {
      "application": sampleApplications[1].id,
      "payload": {
        "message": "a simple message"
      },
      "simulate": true
    };

    superagent.post(global.serverUrl + "/api/pushes")
      .type('application/json')
      .send(testPush)
      .end(function(err, res) {
        res.statusCode.should.equal(201);
        // all the device tokens of the application should be returned
        // as :
        // { "application" : app_id, "tokens" : [arrayoftokens]}
        res.body.should.be.instanceOf(Array);
        res.body.length.should.equal(1);
        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(8);
        res.body[0].should.have.property("application");
        res.body[0].application.should.equal(sampleApplications[1].id);
        done();
      });
  });

  it("- should simulate an APPLICATION push with customCriteria #1 as string", function(done) {
    // simulate a push to an application for "sport push" only
    var testPush = {
      "application": sampleApplications[0].id,
      "payload": {
        "message": "a simple message"
      },
      "customCriteria": '{"sport":true}',
      "simulate": true
    };

    superagent.post(global.serverUrl + "/api/pushes")
      .send(testPush)
      .end(function(err, res) {
        // should return the tokens to send the push to 
        res.statusCode.should.equal(201);
        // all the device tokens with sport should be returned 
        res.body.should.be.instanceOf(Array);
        res.body.length.should.equal(1);
        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(3);
        res.body[0].should.have.property("application");
        res.body[0].application.should.equal(sampleApplications[0].id);

        done();
      });
  });
  it("- should simulate an APPLICATION push with customCriteria #2 as string", function(done) {
    // simulate a push to an application with "no news push"
    var testPush = {
      "application": sampleApplications[0].id,
      "payload": {
        "message": "a simple message"
      },
      "customCriteria": '{"news":{"$ne":true}}',
      "simulate": true
    };

    superagent.post(global.serverUrl + "/api/pushes")
      .type('application/json')
      .send(testPush)
      .end(function(err, res) {
        // should return the tokens to send the push to 
        res.statusCode.should.equal(201);
        // all the device tokens with sport should be returned 
        res.body.should.be.instanceOf(Array);
        res.body.length.should.equal(1);
        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(5);
        res.body[0].should.have.property("application");
        res.body[0].application.should.equal(sampleApplications[0].id);
        done();
      });
  });
  it("- should simulate an APPLICATION push with customCriteria #3 as string", function(done) {
    // simulate a push to an application with "no news push" AND customArray contains "22"
    var testPush = {
      "application": sampleApplications[0].id,
      "payload": {
        "message": "a simple message"
      },
      "customCriteria": '{"news":{"$ne":true},"customArray":"22"}',
      "simulate": true
    };

    superagent.post(global.serverUrl + "/api/pushes")
      .type('application/json')
      .send(testPush)
      .end(function(err, res) {
        console.log(res.body);
        // should return the tokens to send the push to 
        res.statusCode.should.equal(201);

        res.body.should.be.instanceOf(Array);
        res.body.length.should.equal(1);
        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(1);
        res.body[0].should.have.property("application");
        res.body[0].application.should.equal(sampleApplications[0].id);
        // this one is the 7th of the sample set 
        res.body[0].tokens[0].should.equal(sampleData.devices[7].token);
        //console.log(res.body);
        done();
      });
  });


  it("- should simulate an APPLICATION push with customCriteria #1 as object", function(done) {
    // simulate a push to an application for "sport push" only
    var testPush = {
      "application": sampleApplications[0].id,
      "payload": {
        "message": "a simple message"
      },
      "customCriteria": {"sport":true},
      "simulate": true
    };

    superagent.post(global.serverUrl + "/api/pushes")
      .send(testPush)
      .end(function(err, res) {
        // should return the tokens to send the push to 
        res.statusCode.should.equal(201);
        // all the device tokens with sport should be returned 
        res.body.should.be.instanceOf(Array);
        res.body.length.should.equal(1);
        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(3);
        res.body[0].should.have.property("application");
        res.body[0].application.should.equal(sampleApplications[0].id);

        done();
      });
  });
  it("- should simulate an APPLICATION push with customCriteria #2 as object", function(done) {
    // simulate a push to an application with "no news push"
    var testPush = {
      "application": sampleApplications[0].id,
      "payload": {
        "message": "a simple message"
      },
      "customCriteria": {"news":{"$ne":true}},
      "simulate": true
    };

    superagent.post(global.serverUrl + "/api/pushes")
      .type('application/json')
      .send(testPush)
      .end(function(err, res) {
        // should return the tokens to send the push to 
        res.statusCode.should.equal(201);
        // all the device tokens with sport should be returned 
        res.body.should.be.instanceOf(Array);
        res.body.length.should.equal(1);
        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(5);
        res.body[0].should.have.property("application");
        res.body[0].application.should.equal(sampleApplications[0].id);
        done();
      });
  });
  it("- should simulate an APPLICATION push with customCriteria #3 as object", function(done) {
    // simulate a push to an application with "no news push" AND customArray contains "22"
    var testPush = {
      "application": sampleApplications[0].id,
      "payload": {
        "message": "a simple message"
      },
      "customCriteria": {"news":{"$ne":true},"customArray":"22"},
      "simulate": true
    };

    superagent.post(global.serverUrl + "/api/pushes")
      .type('application/json')
      .send(testPush)
      .end(function(err, res) {
        console.log(res.body);
        // should return the tokens to send the push to 
        res.statusCode.should.equal(201);

        res.body.should.be.instanceOf(Array);
        res.body.length.should.equal(1);
        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(1);
        res.body[0].should.have.property("application");
        res.body[0].application.should.equal(sampleApplications[0].id);
        // this one is the 7th of the sample set 
        res.body[0].tokens[0].should.equal(sampleData.devices[7].token);
        //console.log(res.body);
        done();
      });
  });
  it("- should simulate a TARGET push", function(done) {
    // simulate a push to a target
    var testPush = {
      "target": sampleTarget.id,
      "payload": {
        "message": "a simple message"
      },
      "simulate": true
    };

    superagent.post(global.serverUrl + "/api/pushes")
      .type('application/json')
      .send(testPush)
      .end(function(err, res) {
        res.statusCode.should.equal(201);
        // all the device tokens of the target should be returned 
        // two applications returned : those in the target
        res.body.length.should.equal(2);
        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(8);

        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(8);

        done();
      });
  });

  it("- should simulate a TARGET push with customCriteria #1 as string", function(done) {
    // simulate a push to an TARGET for "sport push" only
    var testPush = {
      "target": sampleTarget.id,
      "payload": {
        "message": "a simple message"
      },
      "customCriteria": '{"sport":true}',
      "simulate": true
    };

    superagent.post(global.serverUrl + "/api/pushes")
      .send(testPush)
      .end(function(err, res) {
        // should return the tokens to send the push to 
        res.statusCode.should.equal(201);

        res.body.should.be.instanceOf(Array);
        // two applications returned : those in the target
        res.body.length.should.equal(2);
        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(3);

        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(3);

        done();
      });
  });
  it("- should simulate a TARGET push with customCriteria #2 as string", function(done) {
    // simulate a push to an TARGET with "no news push"
    var testPush = {
      "target": sampleTarget.id,
      "payload": {
        "message": "a simple message"
      },
      "customCriteria": '{"news":{"$ne":true}}',
      "simulate": true
    };

    superagent.post(global.serverUrl + "/api/pushes")
      .send(testPush)
      .end(function(err, res) {
        // should return the tokens to send the push to 
        res.statusCode.should.equal(201);
        // all the device tokens with sport should be returned
        // two applications returned : those in the target
        res.body.length.should.equal(2);
        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(5);

        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(5);
        done();
      });
  });
  it("- should simulate a TARGET push with customCriteria #3 as string", function(done) {
    // simulate a push to an TARGET with "no news push" AND customArray contains "22"
    var testPush = {
      "target": sampleTarget.id,
      "payload": {
        "message": "a simple message"
      },
      "customCriteria": '{"news":{"$ne":true},"customArray":"22"}',
      "simulate": true
    };

    superagent.post(global.serverUrl + "/api/pushes")
      .type('application/json')
      .send(testPush)
      .end(function(err, res) {
        // should return the tokens to send the push to 
        res.statusCode.should.equal(201);
        // all the device tokens with sport should be returned 

        // two applications returned : those in the target
        res.body.length.should.equal(2);
        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(1);

        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(1);


        done();
      });
  });

  it("- should simulate a TARGET push with customCriteria #1 as object", function(done) {
    // simulate a push to an TARGET for "sport push" only
    var testPush = {
      "target": sampleTarget.id,
      "payload": {
        "message": "a simple message"
      },
      "customCriteria": '{"sport":true}',
      "simulate": true
    };

    superagent.post(global.serverUrl + "/api/pushes")
      .send(testPush)
      .end(function(err, res) {
        // should return the tokens to send the push to 
        res.statusCode.should.equal(201);

        res.body.should.be.instanceOf(Array);
        // two applications returned : those in the target
        res.body.length.should.equal(2);
        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(3);

        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(3);

        done();
      });
  });
  it("- should simulate a TARGET push with customCriteria #2 as object", function(done) {
    // simulate a push to an TARGET with "no news push"
    var testPush = {
      "target": sampleTarget.id,
      "payload": {
        "message": "a simple message"
      },
      "customCriteria": '{"news":{"$ne":true}}',
      "simulate": true
    };

    superagent.post(global.serverUrl + "/api/pushes")
      .send(testPush)
      .end(function(err, res) {
        // should return the tokens to send the push to 
        res.statusCode.should.equal(201);
        // all the device tokens with sport should be returned
        // two applications returned : those in the target
        res.body.length.should.equal(2);
        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(5);

        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(5);
        done();
      });
  });
  it("- should simulate a TARGET push with customCriteria #3 as object", function(done) {
    // simulate a push to an TARGET with "no news push" AND customArray contains "22"
    var testPush = {
      "target": sampleTarget.id,
      "payload": {
        "message": "a simple message"
      },
      "customCriteria": '{"news":{"$ne":true},"customArray":"22"}',
      "simulate": true
    };

    superagent.post(global.serverUrl + "/api/pushes")
      .type('application/json')
      .send(testPush)
      .end(function(err, res) {
        // should return the tokens to send the push to 
        res.statusCode.should.equal(201);
        // all the device tokens with sport should be returned 

        // two applications returned : those in the target
        res.body.length.should.equal(2);
        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(1);

        res.body[0].should.have.property("tokens");
        res.body[0].tokens.length.should.equal(1);


        done();
      });
  });
});