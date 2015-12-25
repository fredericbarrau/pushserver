"use strict";
//mongoose-models.js
var mongoose = require('mongoose'),
  mongoosePaginate = require('mongoose-paginate');

var applicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['ios', 'android'],
    lowercase: true
  },
  enabled: {
    type: Boolean,
    required: true,
    default: false
  },
  passphrase: {
    type: String,
    required: false
  },
  key: {
    type: String
  },
  cert: {
    type: String
  },
  pfx: {
    type: String
  }
}, {versionKey: false});
// uniquement for app / type
applicationSchema.index({
  name: 1,
  type: 1
}, {
  unique: true
});

// initialize the pagination plugin
applicationSchema.plugin(mongoosePaginate);

var targetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: {
      unique: true
    }
  },
  description: {
    type: String
  },
  applications: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "application",
      required: true
    }]
});

var deviceSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true,
  },
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "application",
    index: true,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['ios', 'android'],
    lowercase: true,
    index: true
  },
  name: {
    type: String,
    required: false,
    index: {
      text: true
    }
  },
  created: {
    type: Object,
    required: false
  },
  updated: {
    type: Object,
    required: false
  }
}, {versionKey: false, strict: false});
// initialize the pagination plugin
targetSchema.plugin(mongoosePaginate);


// uniqueness for app + type + token
// which is the real primary key of the collection
deviceSchema.index({
  application: 1,
  type: 1,
  token: 1
}, {
  unique: true
});
// default sort 
deviceSchema.index({type:1,application:1,name:1});

// initialize the pagination plugin
deviceSchema.plugin(mongoosePaginate);

var pushSchema = new mongoose.Schema({
  target: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  application: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  device: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  payload: {
    type: String,
    required: true
  },
  customCriteria: {
    type: String,
    required: false
  },
  send: {
    type: Boolean,
    required: true
  },
  created: {
    type: Object,
    required: true
  },
  stats: [{
      type: mongoose.Schema.Types.Mixed
    }]
}, {versionKey: false});

//default sort
pushSchema.index({"created.t" : -1});

// initialize the pagination plugin
pushSchema.plugin(mongoosePaginate);

var collectionsName = {
  application: "applications",
  target: "targets",
  device: "devices",
  push: "pushes"
};

// adding the collection and the logical model name
mongoose.model(collectionsName.application, applicationSchema)["_objectCollectionName"] = 'application';
mongoose.model(collectionsName.application, applicationSchema)["_collectionName"] = 'applications';

mongoose.model(collectionsName.target, targetSchema)["_objectCollectionName"] = 'target';
mongoose.model(collectionsName.target, targetSchema)["_collectionName"] = 'targets';

mongoose.model(collectionsName.device, deviceSchema)["_objectCollectionName"] = 'device';
mongoose.model(collectionsName.device, deviceSchema)["_collectionName"] = 'devices';

mongoose.model(collectionsName.push, pushSchema)["_objectCollectionName"] = 'push';
mongoose.model(collectionsName.push, pushSchema)["_collectionName"] = 'pushes';

module.exports = {
  models: {
    application: mongoose.model(collectionsName.application, applicationSchema),
    device: mongoose.model(collectionsName.device, deviceSchema),
    target: mongoose.model(collectionsName.target, targetSchema),
    push: mongoose.model(collectionsName.push, pushSchema)
  },
  collectionsName: collectionsName
};