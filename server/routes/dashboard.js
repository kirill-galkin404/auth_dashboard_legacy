const express = require('express');
const requireSession = require('../middleware/requireSession');

const router = express.Router();

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const NAMES = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Soylent', 'Hooli', 'Stark', 'Wayne'];
const STATUSES = ['paid', 'pending', 'failed'];

router.get('/dashboard', requireSession, function (req, res) {
  const txns = [];
  for (let i = 0; i < 10; i++) {
    txns.push({
      id: i + 1,
      customer: NAMES[rnd(0, NAMES.length - 1)] + ' Inc',
      amount: rnd(50, 5000),
      status: STATUSES[rnd(0, STATUSES.length - 1)],
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
