import { expect, test } from '@playwright/test';

test.describe('the feeds', () => {
  test('/rss.xml is raw RSS with every published post, and no stylesheet', async ({ request }) => {
    const response = await request.get('/rss.xml');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/xml/);
    const xml = await response.text();
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain(
      '<link>https://www.harrisonjennings.au/blog/formatting-reference/</link>',
    );
    expect(xml).not.toContain('xml-stylesheet');
  });

  for (const path of ['/feed/', '/feed']) {
    test(`the WordPress feed address ${path} moves permanently to /rss.xml`, async ({
      request,
    }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(301);
      expect(new URL(response.headers()['location']!, 'http://x').pathname).toBe('/rss.xml');
    });
  }

  test('every page tells readers where the feed is', async ({ page }) => {
    for (const path of ['/', '/blog/', '/projects/']) {
      await page.goto(path);
      await expect(
        page.locator('link[rel="alternate"][type="application/rss+xml"]'),
      ).toHaveAttribute('href', '/rss.xml');
    }
  });
});

test.describe('the rss page', () => {
  test('explains the feed and copies its full address', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/rss/');
    await expect(page.locator('h1')).toHaveText('rss feed');
    await expect(page.locator('.eyebrow a')).toHaveAttribute('href', '/blog/');
    const button = page.locator('.feedbox button');
    await expect(button).toHaveText('copy address');
    await button.click();
    await expect(button).toHaveText('copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'https://www.harrisonjennings.au/rss.xml',
    );
    await expect(button).toHaveText('copy address', { timeout: 3000 });
  });

  test('"how it works" has three steps, and the latest posts link to all posts', async ({
    page,
  }) => {
    await page.goto('/rss/');
    await expect(page.locator('.steps li')).toHaveCount(3);
    await expect(page.locator('.latest .row').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'all posts' })).toHaveAttribute('href', '/blog/');
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('the address drops its "https://www." so it fits', async ({ page }) => {
      await page.goto('/rss/');
      await expect(page.locator('.feedbox__scheme')).toBeHidden();
      await expect(page.locator('.feedbox__url')).toBeVisible();
      const box = await page.locator('.feedbox').boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    });
  });
});
