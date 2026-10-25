import { expect, test } from '@playwright/test';
import { UNKNOWN_PATH, sitemapPaths } from './site';

const pages = sitemapPaths();

test('the sitemap lists the home page', () => {
  expect(pages).toContain('/');
});

for (const path of pages) {
  test(`${path} returns 200`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
  });
}

// On Cloudflare, an unknown path serves 404.html only to browser page loads (Sec-Fetch-Mode: navigate);
// other requests get a bare "Not found". Both must carry the 404 status. wrangler dev serves the page to both.
for (const path of [UNKNOWN_PATH, '/this-page-does-not-exist']) {
  test(`${path} returns the 404 page to a browser`, async ({ request }) => {
    const response = await request.get(path, {
      maxRedirects: 0,
      headers: { 'Sec-Fetch-Mode': 'navigate', Accept: 'text/html' },
    });
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain('lost the');
  });

  test(`${path} returns 404 to any other request`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
  });
}

// Every link to another site, in posts or in components (project links, the nav icons, the footer),
// opens in a new tab with noopener and tells screen readers so; no link within the site does.
for (const path of pages) {
  test(`${path} opens other sites in a new tab, and only those`, async ({ page }) => {
    await page.goto(path);
    const links = await page.locator('a[href]').evaluateAll((anchors) =>
      anchors.map((a) => ({
        href: a.getAttribute('href') ?? '',
        target: a.getAttribute('target'),
        rel: a.getAttribute('rel') ?? '',
        name: (a.getAttribute('aria-label') ?? '') + (a.textContent ?? ''),
      })),
    );
    for (const link of links) {
      const external =
        /^https?:\/\//.test(link.href) &&
        !/^https?:\/\/(www\.)?harrisonjennings\.au(\/|$)/.test(link.href);
      if (external) {
        expect(link.target, `${link.href} should open in a new tab`).toBe('_blank');
        expect(link.rel.split(' '), `${link.href} should have noopener`).toContain('noopener');
        expect(link.name, `${link.href} should say it opens a new tab`).toContain(
          '(opens in a new tab)',
        );
      } else {
        expect(link.target, `${link.href} should stay in the same tab`).toBeNull();
      }
    }
  });
}

// No page is wider than a phone screen. Anything that pokes out past a scrolling row (the hidden
// "opens in a new tab" notes, for one) makes Chrome lay the whole page out wider and crop it.
test.describe('at phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of pages) {
    test(`${path} doesn't scroll sideways`, async ({ page }) => {
      await page.goto(path);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width).toBeLessThanOrEqual(390);
    });
  }
});
