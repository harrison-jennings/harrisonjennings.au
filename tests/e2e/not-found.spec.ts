import { expect, test } from '@playwright/test';
import { UNKNOWN_PATH } from './site';

test.describe('the 404 page', () => {
  test('offers home, the blog and the latest posts', async ({ page }) => {
    await page.goto(UNKNOWN_PATH);
    await expect(page.locator('h1')).toHaveText(/this page has\s+moved on/);
    await expect(page.getByRole('link', { name: 'go home' })).toHaveAttribute('href', '/');
    await expect(page.getByRole('link', { name: 'read the blog' }).last()).toHaveAttribute(
      'href',
      '/blog/',
    );
    const more = page.locator('.lost__more a');
    expect(await more.count()).toBeGreaterThan(0);
    expect(await more.count()).toBeLessThanOrEqual(3);
  });

  test('the dot bounces, and rests under reduced motion', async ({ browser }) => {
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      const context = await browser.newContext({ reducedMotion });
      const page = await context.newPage();
      await page.goto(UNKNOWN_PATH);
      const name = await page
        .locator('.lost__mark .mark__dot')
        .evaluate((el) => getComputedStyle(el).animationName);
      expect(name === 'none').toBe(reducedMotion === 'reduce');
      await context.close();
    }
  });

  test('the bounce is never clipped', async ({ page }) => {
    await page.goto(UNKNOWN_PATH);
    await expect(page.locator('.lost__mark')).toHaveCSS('overflow', 'visible');
  });
});
