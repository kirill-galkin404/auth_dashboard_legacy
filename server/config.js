const path = require('path');

// SESSION_SECRET falls back to the legacy literal for local development only;
// set it explicitly for any real deployment.
module.exports = {
  port: Number(process.env.PORT) || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'legacy-secret',
  dbPath: process.env.DB_PATH || path.join(__dirname, 'data.sqlite'),
  publicDir: path.join(__dirname, '..', 'public')
};
