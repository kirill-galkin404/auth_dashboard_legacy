const { test, expect } = require('@playwright/test');
const { routeRegExp, login } = require('./helpers');

// These tests used to pin two legacy AngularJS defects. The React rewrite fixes them:
// R-0001: the app checks the current user first; a failed check sends the user to login and
// no dashboard data is loaded. R-0004: logout only leaves the dashboard once the server call
// succeeds, and a failed logout shows a message.

test.describe('formerly known client defects (fixed in the React rewrite)', () => {
  test('R-0001 dashboard 401 redirects to login (was KNOWN DEFECT: silent empty page)', async ({ page }) => {
    let dashboardCalls = 0;
    await page.route('**/api/dashboard', (route) => {
      dashboardCalls += 1;
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not authenticated' }),
      });
    });

    await login(page);

    // The failing (mocked) dashboard call sends the user back to the login route.
    await expect(page).toHaveURL(routeRegExp('login'));
    await expect(page.locator('.login-box')).toBeVisible();
    await expect(page.locator('.kpis')).toHaveCount(0);
    await expect(page.locator('.kpi')).toHaveCount(0);
    await expect(page.locator('.txns')).toHaveCount(0);
  });

  test('R-0004 failed logout shows message and stays on dashboard (was KNOWN DEFECT: silent failure)', async ({ page }) => {
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

    await expect(page.locator('.error')).toBeVisible();
    await expect(page).toHaveURL(routeRegExp('dashboard'));
    await expect(page.locator('.dashboard')).toBeVisible();
    await expect(page.locator('.kpi')).toHaveCount(4);
    await expect(page.locator('.login-box')).toHaveCount(0);
  });
});
