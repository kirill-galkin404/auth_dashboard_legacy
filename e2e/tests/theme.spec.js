const { test, expect } = require('@playwright/test');
const { ADMIN, routeUrl } = require('./helpers');

const SCHEMES = ['light', 'dark'];

// Computed colours of the login page for one colour scheme, including the
// error text shown after a failed login.
async function readColours(page, colorScheme) {
  await page.emulateMedia({ colorScheme });
  await page.goto(routeUrl('login'));
  await expect(page.locator('.hint')).toBeVisible();

  await page.getByPlaceholder('Username').fill(ADMIN.username);
  await page.getByPlaceholder('Password').fill('definitely-wrong');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.locator('.error')).toBeVisible();

  return page.evaluate(() => ({
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    hint: getComputedStyle(document.querySelector('.hint')).color,
    error: getComputedStyle(document.querySelector('.error')).color,
  }));
}

test.describe('colour scheme theming', () => {
  test('light and dark schemes use different page, hint and error colours', async ({ page }) => {
    const colours = {};
    for (const scheme of SCHEMES) {
      colours[scheme] = await readColours(page, scheme);
    }

    expect(colours.light.bodyBackground).not.toBe(colours.dark.bodyBackground);
    expect(colours.light.hint).not.toBe(colours.dark.hint);
    expect(colours.light.error).not.toBe(colours.dark.error);
  });
});
