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

for (const path of [UNKNOWN_PATH, '/this-page-does-not-exist']) {
  test(`${path} returns 404 with the 404 page`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain('nothing here.');
  });
}
