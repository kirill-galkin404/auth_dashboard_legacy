var express = require('express');
var config = require('./config');
var session = require('./session');
require('./db');

var app = express();

app.use(express.json());
app.use(session);
app.use(express.static(config.PUBLIC_DIR));

app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/dashboard'));

if (require.main === module) {
  app.listen(config.PORT, function () {
    console.log('listening on http://localhost:' + config.PORT);
  });
}

module.exports = app;
