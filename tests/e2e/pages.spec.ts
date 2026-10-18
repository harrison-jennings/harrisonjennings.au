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
    expect(await response.text()).toContain('nothing here.');
  });

  test(`${path} returns 404 to any other request`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
  });
}
