var request = require('supertest');
var helpers = require('./helpers');

// KPIs and transactions are random per request, so these tests assert response shape only.
describe('GET /api/dashboard', function () {
  beforeAll(function () { return helpers.waitForSeed(); });
  afterAll(function () { return helpers.closeDb(); });

  test('401 without a session', function () {
    return request(helpers.app).get('/api/dashboard')
      .expect(401)
      .then(function (res) {
        expect(res.body).toEqual({ error: 'not logged in' });
      });
  });

  test('200 with a session returns kpis and transactions in the expected shape', function () {
    return helpers.loggedInAgent().then(function (agent) {
      return agent.get('/api/dashboard').expect(200).then(function (res) {
        expect(Object.keys(res.body.kpis).sort()).toEqual(['conversion', 'orders', 'revenue', 'users']);

        expect(Array.isArray(res.body.transactions)).toBe(true);
        expect(res.body.transactions).toHaveLength(10);
        res.body.transactions.forEach(function (t) {
          expect(Object.keys(t).sort()).toEqual(['amount', 'customer', 'date', 'id', 'status']);
        });
      });
    });
  });
});
