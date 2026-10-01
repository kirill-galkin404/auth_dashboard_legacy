const { test, expect } = require('@playwright/test');
const { ADMIN, routeUrl, routeRegExp, login } = require('./helpers');

const GENERIC_ERROR = 'Invalid username or password';

async function fillAndSubmit(page, username, password) {
  await page.getByPlaceholder('Username').fill(username);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

test.describe('login to dashboard flow', () => {
  test('R-0002 failed login shows error', async ({ page }) => {
    await page.goto(routeUrl('login'));
    await fillAndSubmit(page, ADMIN.username, 'definitely-wrong');
    await expect(page.locator('.error')).toHaveText(GENERIC_ERROR);
    await expect(page).toHaveURL(routeRegExp('login'));
  });

  test('R-0001 unauthenticated dashboard redirects to login', async ({ page }) => {
    await page.goto(routeUrl('dashboard'));
    await expect(page).toHaveURL(routeRegExp('login'));
    await expect(page.locator('.login-box')).toBeVisible();
    await expect(page.locator('.dashboard')).toHaveCount(0);
  });

  test('R-0002 successful login opens dashboard', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(routeRegExp('dashboard'));
    await expect(page.locator('.dashboard')).toBeVisible();
    await expect(page.locator('header span')).toHaveText(ADMIN.username);
    await expect(page.locator('.kpi')).toHaveCount(4);
    await expect(page.locator('.txns tbody tr')).toHaveCount(10);
    await expect(page.locator('.kpi-label')).toHaveText(['Revenue', 'Users', 'Orders', 'Conversion']);
    // Values are shown unformatted: plain digits (no thousands separators or currency symbols).
    const values = await page.locator('.kpi-value').allTextContents();
    expect(values[0]).toMatch(/^\d{5}$/);
    expect(values[1]).toMatch(/^\d{3,4}$/);
    expect(values[2]).toMatch(/^\d{2,4}$/);
    expect(values[3]).toMatch(/^\d{1,2}\.\d{2}%$/);
    const firstRow = await page.locator('.txns tbody tr').first().locator('td').allTextContents();
    expect(firstRow).toHaveLength(5);
    expect(firstRow[0]).toBe('1');
    expect(firstRow[2]).toMatch(/^\d+$/);
    expect(firstRow[3]).toMatch(/^(paid|pending|failed)$/);
    expect(firstRow[4]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('R-0001 refresh reloads dashboard data', async ({ page }) => {
    await login(page);
    await expect(page.locator('.kpi')).toHaveCount(4);

    const requestPromise = page.waitForRequest(
      (req) => req.method() === 'GET' && new URL(req.url()).pathname === '/api/dashboard'
    );
    await page.getByRole('button', { name: 'Refresh' }).click();
    await requestPromise;

    await expect(page.locator('.kpi')).toHaveCount(4);
    await expect(page.locator('.txns tbody tr')).toHaveCount(10);
    await expect(page).toHaveURL(routeRegExp('dashboard'));
  });

  test('R-0004 logout returns to login', async ({ page }) => {
    await login(page);
    await expect(page.locator('.dashboard')).toBeVisible();
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(routeRegExp('login'));
    await expect(page.locator('.login-box')).toBeVisible();

    // The session is really gone: the dashboard is no longer reachable.
    await page.goto(routeUrl('dashboard'));
    await expect(page).toHaveURL(routeRegExp('login'));
  });

  test('R-0005 credential hint visible', async ({ page }) => {
    await page.goto(routeUrl('login'));
    await expect(page.locator('.hint')).toBeVisible();
    await expect(page.locator('.hint')).toContainText('admin / admin123');
  });

  test('R-0003 unknown path redirects to login', async ({ page }) => {
    await page.goto(routeUrl('no/such/page'));
    await expect(page).toHaveURL(routeRegExp('login'));
    await expect(page.locator('.login-box')).toBeVisible();
  });

  test('R-0003 empty path redirects to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(routeRegExp('login'));
    await expect(page.locator('.login-box')).toBeVisible();
  });

  test('R-0001 no dashboard call when me fails', async ({ page }) => {
    const dashboardCalls = [];
    page.on('request', (req) => {
      if (new URL(req.url()).pathname === '/api/dashboard') dashboardCalls.push(req.url());
    });
    let meCalls = 0;
    await page.route('**/api/me', (route) => {
      meCalls += 1;
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not authenticated' }),
      });
    });

    await page.goto(routeUrl('dashboard'));
    await expect(page).toHaveURL(routeRegExp('login'));
    await expect(page.locator('.login-box')).toBeVisible();
    expect(meCalls).toBeGreaterThanOrEqual(1);
    // Give any stray follow-up request a moment to show up before asserting its absence.
    await page.waitForTimeout(500);
    expect(dashboardCalls).toEqual([]);
  });

  test('R-0002 non-401 login failure shows generic error', async ({ page }) => {
    await page.route('**/api/login', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'boom' }),
      })
    );
    await page.goto(routeUrl('login'));
    await fillAndSubmit(page, ADMIN.username, ADMIN.password);
    await expect(page.locator('.error')).toHaveText(GENERIC_ERROR);
    await expect(page).toHaveURL(routeRegExp('login'));
  });
});
