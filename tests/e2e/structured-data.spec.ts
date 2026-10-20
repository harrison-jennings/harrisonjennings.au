import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { sitemapPaths } from './site';

// Every page's structured data (src/lib/structured-data.ts) parses, names the site and its owner,
// and agrees with the page it's on; pages in search have a canonical address, pages kept out don't.

type Thing = Record<string, unknown>;

async function structuredData(page: Page): Promise<Thing[]> {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(scripts, 'one JSON-LD script').toHaveLength(1);
  return JSON.parse(scripts[0]!)['@graph'] as Thing[];
}

const ofType = (things: Thing[], type: string) => things.filter((t) => t['@type'] === type);

for (const path of sitemapPaths()) {
  test(`${path} has valid structured data`, async ({ page, baseURL }) => {
    await page.goto(path);
    const things = await structuredData(page);
    expect(things.map((t) => t['@type'])).toEqual(expect.arrayContaining(['WebSite', 'Person']));

    const noindex = (await page.locator('meta[name="robots"][content*="noindex"]').count()) > 0;
    const canonical = page.locator('link[rel="canonical"]');
    if (noindex) {
      await expect(canonical).toHaveCount(0);
      return;
    }
    const href = await canonical.getAttribute('href');
    expect(new URL(href!).pathname).toBe(path);

    // An inner page's breadcrumbs end at the page itself.
    const [trail] = ofType(things, 'BreadcrumbList');
    if (path !== '/') {
      const items = trail?.['itemListElement'] as Thing[];
      expect(new URL(items.at(-1)!['item'] as string).pathname).toBe(path);
    }

    if (path.startsWith('/blog/') && path.split('/').length === 4 && path !== '/blog/topic/') {
      const [posting] = ofType(things, 'BlogPosting');
      expect(posting, 'a post has a BlogPosting').toBeDefined();
      expect(posting!['headline']).toBe((await page.locator('h1').textContent())?.trim());
      expect(new URL(posting!['url'] as string).pathname).toBe(path);
      expect(posting!['datePublished']).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\+1[01]:00$/);
      // The image is a real file on the site.
      const image = new URL((posting!['image'] as string[])[0]!);
      expect((await page.request.get(`${baseURL}${image.pathname}`)).status()).toBe(200);
    }
  });
}

test('the home page describes the business and what it offers', async ({ page }) => {
  await page.goto('/');
  const [service] = ofType(await structuredData(page), 'ProfessionalService');
  expect((service?.['makesOffer'] as Thing[]).length).toBeGreaterThan(0);
});

test('the sitemap dates every post', () => {
  const sitemap = readFileSync(new URL('../../dist/sitemap-0.xml', import.meta.url), 'utf8');
  const posts = [
    ...sitemap.matchAll(/<url><loc>[^<]+\/blog\/(?!topic\/)[^<]+<\/loc>(.*?)<\/url>/g),
  ];
  expect(posts.length).toBeGreaterThan(0);
  for (const [, rest] of posts) expect(rest).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}/);
});
