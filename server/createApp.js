const express = require('express');
const session = require('express-session');
const config = require('./config');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

module.exports = function createApp() {
  const app = express();

  app.use(express.json());
  app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false
  }));

  // built React client (npm run build)
  app.use(express.static(config.publicDir));

  app.use('/api', authRoutes);
  app.use('/api', dashboardRoutes);

  return app;
};
