'use strict';

/**
 * Orchestrates the contract test run.
 *
 * If BASE_URL is already set in the environment, tests are run directly
 * against that URL (useful for pointing at a server -- Express or the
 * future Python one -- that's already running elsewhere).
 *
 * Otherwise, this script is self-contained: it removes any stale
 * server/data.sqlite (so the legacy server freshly seeds admin/admin123 on
 * boot), spawns the legacy Express server (server/app.js), waits for it to
 * be listening on port 3000, runs the test file against it, and always
 * shuts the server down afterward -- regardless of test outcome.
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');
const SERVER_ENTRY = path.join(REPO_ROOT, 'server', 'app.js');
const SERVER_DB = path.join(REPO_ROOT, 'server', 'data.sqlite');
const DEFAULT_BASE_URL = 'http://localhost:3000';

function waitForServer(url, attempts, delayMs) {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const tryOnce = () => {
      tries += 1;
      fetch(url)
        .then(() => resolve())
        .catch((err) => {
          if (tries >= attempts) {
            reject(new Error('Server did not become ready at ' + url + ': ' + err.message));
            return;
          }
          setTimeout(tryOnce, delayMs);
        });
    };
    tryOnce();
  });
}

function runTests(baseUrl) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--test', path.join(__dirname, 'api-contract.test.js')],
      {
        cwd: __dirname,
        env: Object.assign({}, process.env, { BASE_URL: baseUrl }),
        stdio: 'inherit',
      }
    );
    child.on('exit', (code) => resolve(code === null ? 1 : code));
    child.on('error', () => resolve(1));
  });
}

async function main() {
  const externalBaseUrl = process.env.BASE_URL;

  if (externalBaseUrl) {
    // BASE_URL already provided: assume the target server is already
    // running (Express or Python) and just run the tests against it.
    const code = await runTests(externalBaseUrl);
    process.exit(code);
    return;
  }

  // Self-contained mode: start the legacy Express server ourselves.
  try {
    fs.unlinkSync(SERVER_DB);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const serverProc = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: path.dirname(SERVER_ENTRY),
    stdio: 'inherit',
  });

  let exitCode = 1;
  try {
    await waitForServer(DEFAULT_BASE_URL + '/', 30, 200);
    exitCode = await runTests(DEFAULT_BASE_URL);
  } catch (err) {
    console.error(err.message);
    exitCode = 1;
  } finally {
    serverProc.kill();
  }

  process.exit(exitCode);
}

main();
