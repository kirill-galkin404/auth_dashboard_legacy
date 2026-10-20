var session = require('express-session');
var config = require('./config');

module.exports = session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
});
