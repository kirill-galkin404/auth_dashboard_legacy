var path = require('path');

var KEYS = ['PORT', 'SESSION_SECRET', 'DB_PATH'];
var saved = {};

function loadConfig(env) {
  KEYS.forEach(function (k) { delete process.env[k]; });
  Object.keys(env).forEach(function (k) { process.env[k] = env[k]; });
  var cfg;
  jest.isolateModules(function () { cfg = require('../config'); });
  return cfg;
}

describe('config', function () {
  beforeEach(function () {
    KEYS.forEach(function (k) { saved[k] = process.env[k]; });
    jest.spyOn(console, 'warn').mockImplementation(function () {});
  });

  afterEach(function () {
    KEYS.forEach(function (k) {
      if (saved[k] === undefined) { delete process.env[k]; } else { process.env[k] = saved[k]; }
    });
    jest.restoreAllMocks();
  });

  test('defaults', function () {
    var cfg = loadConfig({});
    expect(Number(cfg.PORT)).toBe(3000);
    expect(cfg.DB_PATH).toBe(path.join(__dirname, '..', 'data.sqlite'));
    expect(cfg.PUBLIC_DIR).toBe(path.join(__dirname, '..', '..', 'public'));
  });

  test('honours PORT and DB_PATH from env', function () {
    var cfg = loadConfig({ PORT: '4567', DB_PATH: ':memory:' });
    expect(Number(cfg.PORT)).toBe(4567);
    expect(cfg.DB_PATH).toBe(':memory:');
  });

  test('uses SESSION_SECRET from env without warning', function () {
    var cfg = loadConfig({ SESSION_SECRET: 'from-env' });
    expect(cfg.SESSION_SECRET).toBe('from-env');
    expect(console.warn).not.toHaveBeenCalled();
  });

  test('falls back to a random secret with a warning when unset', function () {
    var a = loadConfig({});
    var b = loadConfig({});
    expect(typeof a.SESSION_SECRET).toBe('string');
    expect(a.SESSION_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(a.SESSION_SECRET).not.toBe(b.SESSION_SECRET);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });
});
