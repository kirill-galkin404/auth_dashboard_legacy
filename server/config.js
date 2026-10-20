var path = require('path');
var crypto = require('crypto');

var sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn('SESSION_SECRET is not set; using a random per-process secret (sessions will not survive a restart)');
}

module.exports = {
  PORT: process.env.PORT || 3000,
  SESSION_SECRET: sessionSecret,
  DB_PATH: process.env.DB_PATH || path.join(__dirname, 'data.sqlite'),
  PUBLIC_DIR: path.join(__dirname, '..', 'public')
};
