const path = require('path');

const KEYS = ['PORT', 'SESSION_SECRET', 'DB_PATH'];
let saved;

function loadConfig() {
  let config;
  jest.isolateModules(function () {
    config = require('../config');
  });
  return config;
}

beforeEach(function () {
  saved = {};
  KEYS.forEach(function (k) { saved[k] = process.env[k]; delete process.env[k]; });
});

afterEach(function () {
  KEYS.forEach(function (k) {
    if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
  });
});

describe('config', function () {
  test('defaults', function () {
    const config = loadConfig();
    expect(config.port).toBe(3000);
    expect(config.sessionSecret).toBe('legacy-secret');
    expect(config.dbPath).toBe(path.join(__dirname, '..', 'data.sqlite'));
  });

  test('PORT, SESSION_SECRET and DB_PATH come from the environment', function () {
    process.env.PORT = '4321';
    process.env.SESSION_SECRET = 's3cret';
    process.env.DB_PATH = '/tmp/other.sqlite';
    const config = loadConfig();
    expect(config.port).toBe(4321);
    expect(config.sessionSecret).toBe('s3cret');
    expect(config.dbPath).toBe('/tmp/other.sqlite');
  });

  test('an invalid PORT falls back to 3000', function () {
    process.env.PORT = 'abc';
    expect(loadConfig().port).toBe(3000);
  });
});
