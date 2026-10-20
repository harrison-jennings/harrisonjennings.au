import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// What search results and share previews show: a post's searchTitle and searchDescription replace the
// usual title and description there, while the page itself keeps its headline and dek.

const post = '/blog/is-sending-yourself-a-test-email-enough/';

test("a post's search title and description go to search and share previews, not the page", async ({
  page,
}) => {
  await page.goto(post);
  await expect(page).toHaveTitle('is a test send enough? building a Marketo email QA tool');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'is a test send enough? building a Marketo email QA tool',
  );
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  expect(description).toMatch(/^A test send misses more than you think\./);
  expect(description!.length).toBeLessThanOrEqual(155);

  // The page keeps its own headline, and analytics keeps the usual page name.
  await expect(page.locator('h1')).toHaveText('is sending yourself a test email enough?');
  const pageName = await page.evaluate(
    () =>
      (window.dataLayer as Array<Record<string, unknown>>).find((e) => 'page_name' in e)?.[
        'page_name'
      ],
  );
  expect(pageName).toBe('is sending yourself a test email enough? · harrison jennings');
});

test('a post without a search title uses its headline and the site name', async ({ page }) => {
  await page.goto('/blog/');
  await expect(page).toHaveTitle('blog · harrison jennings');
});

test('/rss/ is kept out of search and out of the sitemap', async ({ page }) => {
  await page.goto('/rss/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  const sitemap = readFileSync(new URL('../../dist/sitemap-0.xml', import.meta.url), 'utf8');
  expect(sitemap).not.toContain('/rss/<');
});

test('the home page is in search, with its canonical address', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://www.harrisonjennings.au/',
  );
});
