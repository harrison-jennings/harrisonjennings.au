import { expect, test } from '@playwright/test';

const html = (page: import('@playwright/test').Page) => page.locator('html');
const themeColour = (page: import('@playwright/test').Page) =>
  page.locator('meta[name="theme-color"]').getAttribute('content');

test.describe('first visit', () => {
  test.use({ colorScheme: 'light' });

  test('is dark, even when the device prefers light', async ({ page }) => {
    await page.goto('/');
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      'rgb(18, 17, 16)',
    );
  });
});

test('the toggle switches theme, says the next action and is remembered', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('.nav [data-theme-toggle]');
  await expect(toggle).toHaveAccessibleName('Switch to light mode');

  await toggle.click();
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAccessibleName('Switch to dark mode');
  expect(await themeColour(page)).toBe('#f4efeb');
  expect(await page.evaluate(() => localStorage.getItem('hj-theme'))).toBe('light');

  // The saved choice applies before first paint on the next page.
  await page.goto('/does-not-exist/');
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
  expect(await themeColour(page)).toBe('#f4efeb');

  await page.locator('.nav [data-theme-toggle]').click();
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('hj-theme'))).toBe('dark');
});

test('a phone keeps the toggle in the bar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.nav [data-theme-toggle]')).toBeVisible();
});
