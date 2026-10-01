// The React app uses '#/' hash routes (the AngularJS baseline used '#!/').
const HASH_PREFIX = '#/';

const ADMIN = { username: 'admin', password: 'admin123' };

// routeUrl('login') -> '/#/login'
function routeUrl(path) {
  const clean = String(path).replace(/^\/+/, '');
  return '/' + HASH_PREFIX + clean;
}

// Escapes a string for use inside a RegExp.
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Regex matching the given route in page.url() / expect(page).toHaveURL.
function routeRegExp(path) {
  return new RegExp(escapeRegExp(HASH_PREFIX + String(path).replace(/^\/+/, '')) + '$');
}

// Logs in through the UI and waits for the dashboard route.
async function login(page, creds = ADMIN) {
  await page.goto(routeUrl('login'));
  await page.getByPlaceholder('Username').fill(creds.username);
  await page.getByPlaceholder('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(routeRegExp('dashboard'));
}

module.exports = { HASH_PREFIX, ADMIN, routeUrl, routeRegExp, login };
