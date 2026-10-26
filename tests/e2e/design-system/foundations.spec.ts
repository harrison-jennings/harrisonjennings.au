import { expect, test, type Page } from '@playwright/test';
import { designPages, specimenPages } from './site';

// The design system (design-system/): kept out of search, framed only by itself, and its previews show
// the site's real code. The shell: shell.spec.ts; the preview frame: preview.spec.ts.

const PAGES = [...designPages(), ...specimenPages()];

/** Console errors and refused content (a CSP violation logs one) while a page loads. */
function problems(page: Page): string[] {
  const found: string[] = [];
  page.on('console', (m) => m.type() === 'error' && found.push(m.text()));
  page.on('pageerror', (e) => found.push(String(e)));
  return found;
}

for (const path of PAGES) {
  test(`${path} is never indexed and only the design system may frame it`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    // Cloudflare replaces it with a plain noindex on preview URLs; production sends 'noindex, nofollow'.
    expect(response.headers()['x-robots-tag']).toMatch(/\bnoindex\b/);
    expect(response.headers()['x-frame-options']).toBe('SAMEORIGIN');
    const csp = response.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("frame-src 'self'");
  });

  test(`${path} loads with nothing refused or failing`, async ({ page }) => {
    const found = problems(page);
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(found).toEqual([]);
  });
}

test('a component specimen is the real component, a content specimen the real Markdown pipeline', async ({
  page,
}) => {
  await page.goto('/specimens/button/');
  await expect(page.getByRole('link', { name: 'book a call' }).first()).toHaveClass(/btn/);
  await page.goto('/specimens/callout/');
  await expect(page.locator('.prose .callout')).toHaveCount(3);
});

test('the footer says when and from which commit it was built, linking to it', async ({ page }) => {
  await page.goto('/');
  const stamp = page.locator('footer .ds-stamp');
  await expect(stamp).toContainText(/^built \d{1,2} \w+ \d{4} from [0-9a-f]{7}/);
  const commit = stamp.locator('a');
  const sha = (await stamp.textContent())?.match(/from ([0-9a-f]{7})/)?.[1];
  await expect(commit).toHaveAttribute(
    'href',
    new RegExp(`^https://github.com/harrison-jennings/harrisonjennings.au/commit/${sha}`),
  );
});

test("robots.txt allows crawling, so crawlers can see that nothing's to be indexed", async ({
  request,
}) => {
  // The CD Orchestrator's live check reads it (scripts/design-live-check.sh): Bot Fight Mode lets
  // robots.txt through to GitHub's runners when it challenges the pages.
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);
  const text = await response.text();
  expect(text).toContain('the design system for harrisonjennings.au');
  expect(text).toMatch(/^Allow: \/$/m);
  expect(text).not.toMatch(/^Disallow:/m);
  expect(response.headers()['x-robots-tag']).toMatch(/\bnoindex\b/);
});
