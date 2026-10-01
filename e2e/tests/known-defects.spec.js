const { test, expect } = require('@playwright/test');
const { routeRegExp, login } = require('./helpers');

// These tests pin down TODAY's behaviour of the AngularJS client, including two defects.
// They are deliberately labelled KNOWN DEFECT: the rewrite is expected to change this
// behaviour (R-0001: a failed dashboard call must not leave a blank page; R-0004: a failed
// logout must tell the user), at which point these tests are replaced by the new behaviour.

test.describe('known client defects (legacy behaviour)', () => {
  test('KNOWN DEFECT R-0001 dashboard 401 is swallowed: no redirect and an empty page', async ({ page }) => {
    let dashboardCalls = 0;
    await page.route('**/api/dashboard', (route) => {
      dashboardCalls += 1;
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not authenticated' }),
      });
    });

    // /api/me is real and succeeds because we are genuinely logged in.
    await login(page);
    await expect(page.locator('.dashboard')).toBeVisible();
    await expect(page.locator('header span')).toHaveText('admin');

    // Let the (mocked) failing dashboard call settle, then assert nothing happened.
    await expect.poll(() => dashboardCalls).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(routeRegExp('dashboard'));
    await expect(page.locator('.kpis')).toHaveCount(0);
    await expect(page.locator('.kpi')).toHaveCount(0);
    await expect(page.locator('.txns')).toHaveCount(0);
    // No error message is shown either: the failure is silent.
    await expect(page.locator('.error')).toHaveCount(0);
  });

  test('KNOWN DEFECT R-0004 failed logout is silent: user stays on the dashboard', async ({ page }) => {
    await login(page);
    await expect(page.locator('.kpi')).toHaveCount(4);

    let logoutCalls = 0;
    await page.route('**/api/logout', (route) => {
      logoutCalls += 1;
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Logout failed' }),
      });
    });

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect.poll(() => logoutCalls).toBe(1);
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(routeRegExp('dashboard'));
    await expect(page.locator('.dashboard')).toBeVisible();
    await expect(page.locator('.kpi')).toHaveCount(4);
    await expect(page.locator('.error')).toHaveCount(0);
    await expect(page.locator('.login-box')).toHaveCount(0);
  });
});
