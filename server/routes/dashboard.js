var express = require('express');

var router = express.Router();

router.get('/dashboard', function (req, res) {
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

module.exports = router;
