// DB_PATH must be set before ../app (and thus ../db) is required.
// Jest gives each test file its own module registry, so every file gets its own in-memory db.
process.env.DB_PATH = ':memory:';

var request = require('supertest');
var app = require('../app');
var db = require('../db');

function waitForSeed(retries) {
  retries = retries === undefined ? 100 : retries;
  return new Promise(function (resolve, reject) {
    db.get("SELECT * FROM users WHERE username = 'admin' AND password = 'admin123'", function (err, row) {
      if (!err && row) { resolve(row); return; }
      if (retries <= 0) { reject(err || new Error('seeded admin row not found')); return; }
      setTimeout(function () { waitForSeed(retries - 1).then(resolve, reject); }, 20);
    });
  });
}

function getApp() {
  return waitForSeed().then(function () { return app; });
}

function loggedInAgent() {
  return getApp().then(function () {
    var agent = request.agent(app);
    return agent.post('/api/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(200)
      .then(function () { return agent; });
  });
}

function closeDb() {
  return new Promise(function (resolve) { db.close(function () { resolve(); }); });
}

module.exports = { app: app, db: db, waitForSeed: waitForSeed, getApp: getApp, loggedInAgent: loggedInAgent, closeDb: closeDb };
