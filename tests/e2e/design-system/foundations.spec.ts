import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The design system (design-system/): kept out of search, framed only by itself, and its previews show
// the site's real code at true widths, in both themes, with the site's fonts.

const PAGES = ['/', '/specimens/button/', '/specimens/callout/'];

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

test('previews render each specimen at a true width, in the theme asked for, with the fonts', async ({
  page,
}) => {
  await page.goto('/');
  const frames = page.locator('[data-preview] iframe');
  await expect(frames).toHaveCount(8);
  for (const frame of await frames.all()) {
    const width = Number(await frame.getAttribute('width'));
    const theme = await frame.getAttribute('data-theme-name');
    const inside = frame.contentFrame();
    await expect(inside.locator('html')).toHaveAttribute('data-theme', theme ?? '');
    expect(await inside.locator('body').evaluate(() => window.innerWidth)).toBe(width);
    await expect
      .poll(() =>
        inside.locator('body').evaluate(() => document.fonts.check('16px "Schibsted Grotesk"')),
      )
      .toBe(true);
    // The frame grows to fit what the specimen reports.
    await expect.poll(async () => (await frame.boundingBox())?.height ?? 0).toBeGreaterThan(40);
  }
});

test('a component specimen is the real component, a content specimen the real Markdown pipeline', async ({
  page,
}) => {
  await page.goto('/specimens/button/');
  await expect(page.getByRole('link', { name: 'book a call' })).toHaveClass(/btn/);
  await page.goto('/specimens/callout/');
  await expect(page.locator('.prose .callout')).toBeVisible();
});

test('the code under a preview is the example, and copies', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const button = page.locator('[data-preview]').first();
  await expect(button.locator('pre')).toHaveText('<Button href="/#book" label="book a call" />');
  await button.getByRole('button', { name: /copy/ }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    '<Button href="/#book" label="book a call" />',
  );
});

test('the footer says which commit it was built from, linking to it', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer');
  const commit = footer.locator('a code');
  await expect(commit).toHaveText(/^[0-9a-f]{7}$/);
  const sha = await commit.textContent();
  await expect(footer.locator('a')).toHaveAttribute(
    'href',
    new RegExp(`^https://github.com/harrison-jennings/harrisonjennings.au/commit/${sha}`),
  );
  await expect(footer).toContainText(/, \d{1,2} \w+ \d{4}$/);
});

for (const path of PAGES) {
  test(`${path} has no axe violations`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
  });
}
