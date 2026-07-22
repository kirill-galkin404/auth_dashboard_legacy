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

app.listen(3000, function () {
  console.log('listening on http://localhost:3000');
});
