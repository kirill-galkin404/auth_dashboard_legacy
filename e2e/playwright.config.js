const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'node ../server/app.js',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
