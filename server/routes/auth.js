const express = require('express');
const db = require('../db');
const requireSession = require('../middleware/requireSession');

const router = express.Router();

router.post('/login', function (req, res) {
  const username = req.body.username;
  const password = req.body.password;
  // legacy: raw string SQL concatenation (intentionally injectable, pinned by contract tests)
  const sql = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
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

router.get('/me', requireSession, function (req, res) {
  res.json({ username: req.session.user.username });
});

module.exports = router;
