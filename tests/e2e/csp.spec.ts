import { expect, test, type Page } from '@playwright/test';
import { sitemapPaths } from './site';

// The site's own pages and scripts run within the Content-Security-Policy the build writes (sent as
// Report-Only, which still raises a violation event for anything it would block). Tag Manager isn't
// loaded in tests; what it loads is checked through the reports once it's live.

/** Collects every CSP violation the page raises, from before its first script. */
async function watchViolations(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { cspViolations: string[] }).cspViolations = seen;
    document.addEventListener('securitypolicyviolation', (e) =>
      seen.push(`${e.effectiveDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`),
    );
  });
  return () =>
    page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations);
}

for (const path of sitemapPaths()) {
  test(`${path} runs within the policy`, async ({ page }) => {
    const violations = await watchViolations(page);
    await page.goto(path);
    await page.waitForLoadState('load');
    expect(await violations()).toEqual([]);
  });
}

test('the cookie banner, preferences and a choice run within the policy', async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  const violations = await watchViolations(page);
  await page.goto('/');
  await page
    .getByRole('region', { name: 'cookies' })
    .getByRole('button', { name: 'manage preferences' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'cookie preferences' });
  await dialog.getByRole('switch').first().click();
  await dialog.getByRole('button', { name: 'save choices' }).click();
  await page.reload();
  expect(await violations()).toEqual([]);
  await context.close();
});

test("a post's video is allowed to play from youtube-nocookie.com", async ({ page }) => {
  const violations = await watchViolations(page);
  // The formatting reference (a draft, built for tests) has the video. Nothing loads from YouTube in
  // the test; the frame is refused or allowed before any request.
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.fulfill({ body: '' }));
  await page.goto('/blog/formatting-reference/');
  await page
    .getByRole('button', { name: /^Play video/ })
    .first()
    .click();
  await expect(page.locator('.video iframe').first()).toBeAttached();
  expect(await violations()).toEqual([]);
});

test("each page's data layer keys still reach the data layer", async ({ page }) => {
  await page.goto('/blog/whats-this-all-about/');
  const keys = await page.evaluate(() =>
    (window.dataLayer as Array<Record<string, unknown>>).find((entry) => 'page_type' in entry),
  );
  expect(keys).toMatchObject({ page_type: 'post', post_id: '1', post_author: 'Harrison Jennings' });
});

test('the report endpoint records a violation report', async ({ request, baseURL }) => {
  const response = await request.post('/api/csp-report', {
    headers: { 'Content-Type': 'application/csp-report' },
    data: JSON.stringify({
      'csp-report': {
        'document-uri': `${baseURL}/`,
        'effective-directive': 'img-src',
        'blocked-uri': 'https://example.com/pixel.gif',
      },
    }),
  });
  expect(response.status()).toBe(204);
  const junk = await request.post('/api/csp-report', {
    headers: { 'Content-Type': 'application/csp-report' },
    data: '{}',
  });
  expect(junk.status()).toBe(400);
});

test('a script outside the policy is caught (so a clean run means something)', async ({ page }) => {
  const violations = await watchViolations(page);
  await page.goto('/');
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.unlisted = true;';
    document.head.append(script);
  });
  await expect.poll(violations).toEqual([expect.stringMatching(/^script-src-elem inline /)]);
});
