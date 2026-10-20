var express = require('express');
var db = require('../db');

var router = express.Router();

router.post('/login', function (req, res) {
  var username = req.body.username;
  var password = req.body.password;
  // legacy: raw string SQL concatenation (intentionally injectable)
  var sql = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
  db.get(sql, function (err, row) {
    if (err) { res.status(500).json({ ok: false, error: 'db error' }); return; }
    if (!row) { res.status(401).json({ ok: false, error: 'bad credentials' }); return; }
    req.session.user = { id: row.id, username: row.username };
    res.json({ ok: true, username: row.username });
  });
});

router.post('/logout', function (req, res) {
  req.session.destroy(function () {
    res.json({ ok: true });
  });
});

router.get('/me', function (req, res) {
  if (req.session && req.session.user) {
    res.json({ username: req.session.user.username });
  } else {
    res.status(401).json({ error: 'not logged in' });
  }
});

module.exports = router;
