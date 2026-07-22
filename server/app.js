var express = require('express');
var session = require('express-session');
var path = require('path');
var db = require('./db');

var app = express();

app.use(express.json());
app.use(session({
  secret: 'legacy-secret',
  resave: false,
  saveUninitialized: false
}));

// static frontend (files added in later tasks)
app.use(express.static(path.join(__dirname, '..', 'public')));

app.post('/api/login', function (req, res) {
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

app.post('/api/logout', function (req, res) {
  req.session.destroy(function () {
    res.json({ ok: true });
  });
});

app.get('/api/me', function (req, res) {
  if (req.session && req.session.user) {
    res.json({ username: req.session.user.username });
  } else {
    res.status(401).json({ error: 'not logged in' });
  }
});

app.get('/api/dashboard', function (req, res) {
  if (!req.session || !req.session.user) {
    res.status(401).json({ error: 'not logged in' });
    return;
  }

  function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  var names = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Soylent', 'Hooli', 'Stark', 'Wayne'];
  var statuses = ['paid', 'pending', 'failed'];
  var txns = [];
  var i;
  for (i = 0; i < 10; i++) {
    txns.push({
      id: i + 1,
      customer: names[rnd(0, names.length - 1)] + ' Inc',
      amount: rnd(50, 5000),
      status: statuses[rnd(0, statuses.length - 1)],
      date: new Date(Date.now() - rnd(0, 30) * 86400000).toISOString().slice(0, 10)
    });
  }

  res.json({
    kpis: {
      revenue: rnd(10000, 99999),
      users: rnd(100, 9999),
      orders: rnd(50, 2000),
      conversion: (Math.random() * 10).toFixed(2) + '%'
    },
    transactions: txns
  });
});

app.listen(3000, function () {
  console.log('listening on http://localhost:3000');
});
