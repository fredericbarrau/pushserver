Pushserver
===========================

Pushserver is a push management platform for both IOS and Android. It allows to send pushes by application, by target (several applications at the same time), or by device.

It provides a Rest API to send push to both platform and to organize applications, devices and target.

Pushserver comes with a simple GUI for administration and testing purpose.

## Installation

*Prerequisites*

Pushserver uses [mongoDB](http://www.mongodb.org/about/introduction/) to store data. You will have to install a mongo database.

+ Using Git

```shell
$ git clone 
$ npm install
```

+ Using npm

```shell
$ npm install pushserver
$ npm install
```

## Configuration

Pushserver uses [config](http://lorenwest.github.io/node-config/) module to manage configuration files. The file _default.json_ contains the default configuration.

Environment (development/production) files can override default configuration. Environment is defined by the NODE_ENV environment variable.

```shell
NODE_ENV=production npm start
```

Configuration files can be specified by environment (using ENV environment variable), by hostname, or both.
More information can be found in the [config module documentation](https://github.com/lorenwest/node-config/wiki/Configuration-Files).

**default.json**

Defaut configuration file contains main configuration 
```javascript
{
  "pushserver": {
    "dbConfig": {
      "connectionUrl": "mongodb://localhost/pushserver",
      "type": "mongodb"
    },

    "apn": {
      "connection": {
        "cacheLength" : 5000,
        "autoAdjustCache": true
      },
      "feedback": {
        "batchFeedback": true,
        "interval" : 43200 //"interval" : 10
      }
    },
    "gcm": {
      "connection" : {
        "numRetries" : 4
      },
      "messageOptions" : {
        "delayWhileIdle" : true,
        "timeToLive" : 3
        //"dryRun" : true
      }
    },
    "name": "Push Manager",
    "bindAddressGUI" : ["0.0.0.0"],
    "bindAddressAPI" : "0.0.0.0",
    "port": 3001
  }
}
```
|**Parameter**|**Description**|
|----------|-----------------------|
| dbConfig | database configuration. MongoDB is the only database supported for now. Connexion url uses the default mongodb url format.|
| apn | Default APN connection options. For more information, see [APN module documentation](https://github.com/argon/node-apn/blob/master/doc/connection.markdown) |
| gcm | Default GCM connection options. For more information, see [GCM module documentation](https://github.com/ToothlessGear/node-gcm)|
| bindAddressGUI | Limit the access of the GUI to a single IP address or an array of IPs. Use "0.0.0.0" (as a string, or in the array) for allowing the access from any host (should be avoided in production).|
| bindAddressAPI | Limit the access of the GUI to a single IP address or an array of IPs. Use "0.0.0.0" (as a string, or in the array) for allowing the access to the API from any host . Note that access to device registration (PUT/POST to api/devices/device see below) is allowed to any IP.|
| port | The port used by the push server. |

## Starting pushserver

Pushserver works as a server, it opens a port, stays opened, waiting for requests.

For testing purpose, you can start pushserver using npm : 

### Using npm
```shell
$ npm start
```

In production, you should instead launch it as a daemon, using tools like [pm2](https://github.com/Unitech/pm2) or [forever](https://github.com/nodejitsu/forever).

## Quick Start

### Creating an application

- **Using the GUI :** Go to `http://<server host>:<server port>/admin/application/` and click on "add an application". Fill the form.
- **Using the API :**

Send the following JSON in a POST request to :`http://<server host>:<server port>/api/applications/application` :
For IOS : 
```javascript
{
  "name" :"Foo App",
  "type":"ios",
  "key" :"<Your app's key path | your app's key as string>",
  "cert" :"<Your app's cert path | your app's cert as string>",
}
```
For GCM :
```javascript
{
  "name" :"Foo App",
  "type":"android",
  "key" :"<Your app's key path | your app's key as string>",
}
```

Use content-type "application/json" and UTF-8 charset.

[More information about the Applications Rest API](#applications)

### Registering a device

- **Using the GUI :** Go to `http://<server host>:<server port>/admin/devices/ and click on "add a device". Fill the form.
- **Using the API :**

Send the following JSON in a POST request to :`http://<server host>:<server port>/api/devices/device` :
For IOS:
```javascript
{
  "name" :"Foo Device",
  "application" : "<the ID of the created ios application above>"
  "type":"ios",
  "token" : "<the device token for this app>"
}
```
For GCM: 
```javascript
{
  "name" :"Foo Device",
  "application" : "<the ID of the created android application above>"
  "type":"android",
  "token" : "<the device token for this app>"
}
```
Use content-type "application/json" and UTF-8 charset.

[More information about the device Rest API](#devices)

### Sending a simple push

- **Using the GUI :** Go to `http://<server host>:<server port>/push` and fill the form. Use "send to a single device" and search for your device name.
- **Using the API:**

Send the following JSON in a POST request to : `http://<server post>:<server port>/api/pushes/push`:
```javascript
{
  "application":"<the ID of the created application above>",
  "device" : "<the ID of the created device above >",
  "payload" :"Hello World"
}

```
Use content-type "application/json" and UTF-8 charset.

## Rest API

Rest-like API. All POST/PUT requests must have a content-type of **application/json** and their charset must be **UTF-8**. Results will be returned as JSON using UTF-8 encoding.

**HTTP responses code used :**

+ 200 - request OK
+ 201 - Created
+ 400 - badly formed request (an error in the content send)
+ 403 - request/page not allowed (forbidden by bind-address param)
+ 404 - request not found

**Errors return JSON format :** 
```javascript
{
"status" : ""
"message" : ""
}
```
### Applications

#### Rest API

Url|Method|Description|Param|Result
--|:--:|--|--|--
`/api/applications`|GET|List all the applications||List all the applications
`/api/applications/application/:id`|GET|Retrieve an application|ID of the application|The application object requested
`/api/applications/application/`|POST|Create an application|JSON formatted [application object](#application-object)|The application object created
`/api/applications/application/:id`|PUT|Create/Update an application|JSON formatted [application object](#application-object). The object must provide whether the application or the couple (application,type) to identify the application to update.|The application object created/updated
`/api/applications/application/:id`|DELETE|Delete an application|ID of the application|The application object deleted

#### Application object

Field|Format|Required|Desc
-----|------|:---------:|---------
name|string|X|A name for the application.
type|"ios" or "android"|X| Type of the application.
key|String|X| A file path to the key file OR the key as string.
cert|String|| IOS only - A file path to the cert file OR the certificate as string.
pfx|String|| IOS only - File path for private key, certificate and CA certs in PFX or PKCS12 format, or a string containing the PFX data. If supplied, it will be used instead of certificate and key above.
passphrase|String|| IOS only - if any, the passphrase used while creating the key & cert files. Must be identical for both.
ID|string||Internal application ID. Given by the API. Should be provided for PUT request only in order to update name or type.

_Examples :_
```javascript
{
  "name" : "Foo App",
  "type" : "android",
  "key"  : "---BEGIN KEY BLABLABLA___..."
}
```
```javascript
{
 "name" : "Foo App",
  "type" : "ios",
  "pfx"  : "/path/to/my/cert/files/serverside/of/course/"
}
```

### Targets

#### Rest API

Url|Method|Description|Param|Result
--|:--:|--|--|--
`/api/targets`|GET|List all the targets||List all the targets
`/api/targets/target/:id`|GET|Retrieve a target|ID of the target|The target object requested
`/api/targets/target/`|POST|Create a target|JSON formatted [target object](#target-object)|The target object created
`/api/targets/target/:id`|PUT|Create/Update a target|JSON formatted [target object](#target-object)|The target object created/updated
`/api/targets/target/:id`|DELETE|Delete a target|Target ID|The target object deleted

#### Target object

Field|Format|Required|Desc
-----|------|:---------:|---------
name|string|X|A name for the target.
desc|string|X| Description for the target.
applications|Array of application ID|X| The applications which will be targeted when this target is used for sending a push.
ID|string||Internal target ID. Given by the API. Should be provided for PUT request only in order to update name.

_Example :_
```javascript
{
  "name" : "Foo target",
  "desc" : "All my super apps",
  "applications"  : ["APPID1","APPID2"]
}
```
### Devices

#### Rest API

Url|Method|Description|Param|Result
--|:--:|--|--|--
`/api/devices`|GET|List all the devices||List all the devices
`/api/devices/device/:id`|GET|Retrieve a device|ID of the device|The device object requested
`/api/devices/device/`|POST|Register a device for an application|JSON formatted [device object](#device-object)|The device object created
`/api/devices/device/:id`|PUT|Create/Update a device|JSON formatted [device object](#device-object). The object must provide whether the ID or the couple (token,application) in order to idenfify the device to update. |The device object created/updated
`/api/devices/device/:id`|DELETE|Delete a device|Device ID|The device object deleted

#### Device object 

Field|Format|Required|Desc
-----|------|:---------:|---------
token|string|X|Token of the device.
application|string|X|Application ID this device.
type|"ios" or "android"|X| Type of the device.
name|string||Name for this device. Used by the GUI to search a device to send a push to.

**_Custom Data_:** Device object can include custom data which can then be used by custom query for selecting specific devices to send notifications. [See custom query](#custom-query) for more info

When returned by the API, the device object contains these additional fields : 

Field|Format|Required|Desc
-----|------|:---------:|---------
ID|string||Device ID.

_Examples :_
```javascript
{
  "token" : "some-weird-token-string",
  "type" : "android",
  "name"  : "Foo Galaxy Note"
}

{
  "token" : "another-some-weird-token-string",
  "type" : "android",
  "name"  : "Some Nexus",
  "premium-user": true // custom data
}
```

#### Registering a device for an application

Just send a PUT/POST request as explained above from your device.

### Notification API

#### Rest API

Url|Method|Description|Param|Result
--|:--:|--|--|--
`/api/pushes`|GET|List all the submitted notifications||Array of all submitted the notifications
`/api/pushes/push/:id`|GET|Retrieve a push|ID of the push|The [push object](#push-object) requested 
`/api/pushes/push/`|POST|Create (send) a push|see [Sending a push](#sending-a-push)|The [push object](#push-object) submitted
`/api/pushes/push/:id`|DELETE|Delete a push. Does NOT cancel a submitted push.|push ID|The [push object](#push-object) deleted 

#### Push Object

Field|Format|Required|Desc
-----|------|:---------:|---------
target|string|X(*)|Target ID for this notification [See sending a push](#sending-a-push).
application|string|X(*)|Application ID this notification [See sending a push](#sending-a-push).
device|string|X(*)| Device ID for this notificaiton [See sending a push](#sending-a-push)
payload|string or stringified json|X|the payload to send to the targetted devices.
customCriteria|stringified json || a mongodb query [See custom query](#sending-a-push)
simulate|boolean|| If true, returns the tokens targetted by this notification. Notification are NOT sent. 

When returned by the API, the push object contains these additional fields : 

Field|Format|Required|Desc
-----|------|:---------:|---------
ID|string||Push ID.
created|date||Creation date / submission date
stats|json||Statistics of the notifications sent.

*: one amongst device+application | application | target

#### Sending a push

A notification can be sent to a device, an application, or a target.

1# To a single device:

The push object must contain the device ID (NOT the token) and the application ID. The notification is sent to that device only.

_Example:_
```javascript
{
  "application" : "<some app ID>",
  "device" : "<some device ID of this applicaiton>",
  "payload" : "Hello you"
}
```

2# To an application:

The push object must contain the application ID. The notification is sent to all devices registered to this application.

_Example:_
```javascript
{
  "application" : "<some app ID>",
  "payload" : "Hello all of you"
}
```

3# To a target:

The push object must contain the target ID. The notification is sent to all devices registered to all the applications gathered by the target.

_Example:_
```javascript
{
  "target" : "<some target ID>",
  "payload" : "Hello all of you all."
}
```

### Payload

Payload can be a simple string or a json object. When an object is sent through payload to a mobile application, it must be handled by the application. See GCM & Apple push notifications documentation.

_Example:_
```javascript
{
  "message" :"Hello There",
  "customField" : "App should know what to do with this one."
}
```

#### Custom Query

Devices can send custom data to enhance the notification possibilities. These data are stored and can then be queried to limit the notifications target.

_Example_:

Say you have "premium" users for your applications. These users register their devices like so : 

`POST /api/devices/device`
```javascript
{
  "token" :"<token>"
  "application": "<app ID>",
  "userMail" : "bla@yopmail.com", // custom data
  "premium" : true // custom data
}
```
Let's say you want to send a particular notification to your premium user ***only***. You can limit the notified devices using the "premium"
 field with the customCriteria query :

 `POST /api/pushes/push`
 ```javascript
 {
  "application" : "<your app ID>"
  "payload" : "Hello premium dudes !",
  "customCriteria" : {"premium":true}
 }
 ```

customCriteria uses the [mongoDB query syntax](http://docs.mongodb.org/manual/reference/operator/query/) against the fields of the documents stored in the "devices" mongo collection. The query limits the selection of devices you get using the application/target/device fields.

Given the previous device example, you can also **exclude** that particular device from a notification : 

 `POST /api/pushes/push`
 ```javascript
 {
  "application" : "<your app ID>"
  "payload" : "Hello premium dudes minus bla !",
  "customCriteria" : {"userMail":{"$not":"bla@yopmail.com"}}
 }
 ```

# Licence
Copyright (c) 2014 Frédéric Barrau

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
