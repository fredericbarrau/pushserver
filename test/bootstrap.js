var mongoose = require('../app/models/mongoose-connect').mongoose;

// instiate the server
global.server = require('../server');
global.config = config = require('config').get('pushserver');
global.server.set('port', process.env.PORT || config.get('port') || 4000);

// Starting the server
global.server.listen(server.get('port'), function() {
  console.log('Pushserver-test started on port ' + server.address().port);
});
// server URL
global.serverUrl =  "http://localhost:" + global.server.get('port');

// Dropping the database first, after connection
mongoose.connection.on('connected', function() {
  mongoose.connection.db.dropDatabase(function(err, data) {
    if (err) {
      console.error(err.message); 
    }
  });
});