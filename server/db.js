var sqlite3 = require('sqlite3');
var path = require('path');

var db = new sqlite3.Database(path.join(__dirname, 'data.sqlite'));

db.serialize(function () {
  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)');
  db.get('SELECT COUNT(*) AS c FROM users', function (err, row) {
    if (err) { console.log('db count error', err); return; }
    if (row.c === 0) {
      db.run("INSERT INTO users (username, password) VALUES ('admin', 'admin123')");
      console.log('seeded admin user');
    }
  });
});

module.exports = db;
