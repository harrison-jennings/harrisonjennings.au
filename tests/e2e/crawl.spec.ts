import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// Every URL the WordPress site published, or that Google knew about, still leads somewhere: straight
// to a page, or one 301 to a page (never a chain), and WordPress-only addresses are a real 404. Unlike
// the redirects spec, this also catches a kept page that quietly stopped existing.
const urls = JSON.parse(
  readFileSync(new URL('fixtures/wordpress-urls.json', import.meta.url), 'utf8'),
) as { kept: string[]; gone: string[] };

for (const path of urls.kept) {
  test(`${path} answers 200, or 301s once to a page that does`, async ({ request, baseURL }) => {
    const first = await request.get(path, { maxRedirects: 0 });
    if (first.status() === 200) return;
    expect(first.status(), `${path} should answer 200 or 301`).toBe(301);
    const target = new URL(first.headers()['location']!, baseURL);
    const second = await request.get(target.pathname, { maxRedirects: 0 });
    expect(
      second.status(),
      `${path} → ${target.pathname} should answer 200, not redirect again`,
    ).toBe(200);
  });
}

for (const path of urls.gone) {
  test(`${path} is a real 404`, async ({ request }) => {
    expect((await request.get(path, { maxRedirects: 0 })).status()).toBe(404);
  });
}
