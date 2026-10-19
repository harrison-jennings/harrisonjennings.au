import { expect, test } from '@playwright/test';
import { UNKNOWN_PATH } from './site';

const SITE = 'https://www.harrisonjennings.au';

/** Width and height from a PNG's header. */
const pngSize = (body: Buffer) => ({ width: body.readUInt32BE(16), height: body.readUInt32BE(20) });

const cases: Array<[string, string]> = [
  ['/', '/og/index.png'],
  ['/blog/', '/og/blog.png'],
  ['/blog/formatting-reference/', '/og/blog/formatting-reference.png'],
  ['/projects/', '/og/projects.png'],
  ['/rss/', '/og/rss.png'],
  // Pages without a card of their own share the home card.
  ['/privacy-policy/', '/og/index.png'],
  [UNKNOWN_PATH, '/og/index.png'],
];

for (const [page, image] of cases) {
  test(`${page} shares ${image}, a 1200 × 630 PNG`, async ({ page: browser, request }) => {
    await browser.goto(page);
    for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
      await expect(browser.locator(selector)).toHaveAttribute('content', `${SITE}${image}`);
    }
    await expect(browser.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    );
    const response = await request.get(image);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    expect(pngSize(await response.body())).toEqual({ width: 1200, height: 630 });
  });
}
