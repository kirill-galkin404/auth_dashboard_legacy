var request = require('supertest');
var helpers = require('./helpers');
var db = require('../db');

describe('auth API', function () {
  beforeAll(function () { return helpers.waitForSeed(); });
  afterAll(function () { return helpers.closeDb(); });
  afterEach(function () { jest.restoreAllMocks(); });

  describe('POST /api/login', function () {
    test('200 with valid credentials', function () {
      return request(helpers.app).post('/api/login')
        .send({ username: 'admin', password: 'admin123' })
        .expect(200)
        .then(function (res) {
          expect(res.body).toEqual({ ok: true, username: 'admin' });
        });
    });

    test('401 bad credentials with wrong password', function () {
      return request(helpers.app).post('/api/login')
        .send({ username: 'admin', password: 'nope' })
        .expect(401)
        .then(function (res) {
          expect(res.body).toEqual({ ok: false, error: 'bad credentials' });
        });
    });

    test('500 db error when db.get fails', function () {
      jest.spyOn(db, 'get').mockImplementation(function (sql, cb) {
        cb(new Error('boom'));
      });
      return request(helpers.app).post('/api/login')
        .send({ username: 'admin', password: 'admin123' })
        .expect(500)
        .then(function (res) {
          expect(res.body).toEqual({ ok: false, error: 'db error' });
        });
    });
  });

  describe('GET /api/me', function () {
    test('401 without a session', function () {
      return request(helpers.app).get('/api/me')
        .expect(401)
        .then(function (res) {
          expect(res.body).toEqual({ error: 'not logged in' });
        });
    });

    test('200 with a session', function () {
      return helpers.loggedInAgent().then(function (agent) {
        return agent.get('/api/me').expect(200).then(function (res) {
          expect(res.body).toEqual({ username: 'admin' });
        });
      });
    });
  });

  describe('POST /api/logout', function () {
    test('returns {ok:true}', function () {
      return request(helpers.app).post('/api/logout')
        .expect(200)
        .then(function (res) {
          expect(res.body).toEqual({ ok: true });
        });
    });
  });

  test('login -> me -> logout -> me workflow', function () {
    var agent = request.agent(helpers.app);
    return agent.post('/api/login').send({ username: 'admin', password: 'admin123' }).expect(200)
      .then(function () { return agent.get('/api/me').expect(200); })
      .then(function (res) {
        expect(res.body).toEqual({ username: 'admin' });
        return agent.post('/api/logout').expect(200);
      })
      .then(function (res) {
        expect(res.body).toEqual({ ok: true });
        return agent.get('/api/me').expect(401);
      })
      .then(function (res) {
        expect(res.body).toEqual({ error: 'not logged in' });
      });
  });
});
