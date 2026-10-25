import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { parse } from 'yaml';

// The component pages (design-system/src/content/docs/components): every component has a page, or is
// named here with the page that shows it, so a new component can't go undocumented; and the props
// tables, read from each component's code, explain every prop.

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const DOCS = join(ROOT, 'design-system/src/content/docs');

function files(dir: string, ext: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(join(dir, e.name), ext)
      : e.name.endsWith(ext)
        ? [join(dir, e.name)]
        : [],
  );
}

/** Each page's id (components/button) and its frontmatter. */
const pages = files(DOCS, '.mdx').map((file) => {
  const text = readFileSync(file, 'utf8');
  const front = parse(text.slice(4, text.indexOf('\n---', 4))) as { component?: string };
  return { id: relative(DOCS, file).replace(/\.mdx$/, ''), component: front.component };
});

/**
 * Components shown on another component's page, or on a page still to come, rather than their own.
 * Each says where. Anything in src/components that's neither documented nor here fails the test.
 */
const ELSEWHERE: Record<string, string> = {
  'src/components/Arrows.astro': 'the swipe rows of what I do, keep reading and latest posts',
  'src/components/Icon.astro': 'brand/icons',
  'src/components/LiveDot.astro': 'components/live-signal',
  'src/components/PostCardView.astro': 'components/post-card',
  'src/components/ProjectLinks.astro': 'components/built-and-shipped',
  'src/components/ProjectShot.astro': 'components/built-and-shipped',
  'src/components/Steps.astro': 'the overview and the rss template (step 7)',
  'src/components/ThemeHead.astro': 'components/theme-toggle',
  'src/components/blog/Eyebrow.astro': 'the blog templates (step 7)',
  'src/components/blog/PageHead.astro': 'the blog templates (step 7)',
  'src/components/blog/PostArchive.astro': 'the blog templates (step 7)',
  'src/components/blog/PostEnd.astro': 'the post template (step 7)',
  'src/components/blog/PostRow.astro': 'the blog templates (step 7)',
  'src/components/blog/PostTags.astro': 'components/post-header',
  'src/components/blog/TopicChips.astro': 'the blog templates (step 7)',
  'src/components/home/LatestPosts.astro': 'components/post-card',
  'src/components/prose/Figures.astro': 'the content pages (step 6)',
  'src/components/prose/YouTube.astro': 'the content pages (step 6)',
};

test('every component has a page, or is named with the page that shows it', () => {
  const documented = new Set(pages.map((p) => p.component).filter(Boolean));
  const missing = files(join(ROOT, 'src/components'), '.astro')
    .map((file) => relative(ROOT, file))
    .filter((file) => !documented.has(file) && !ELSEWHERE[file]);
  expect(missing, `no design system page: ${missing.join(', ')}`).toEqual([]);
});

test("every page's component exists, and every component page names one", () => {
  for (const { id, component } of pages) {
    if (id.startsWith('components/')) expect(component, `${id}: no component`).toBeTruthy();
    if (component) expect(existsSync(join(ROOT, component)), `${id}: ${component}`).toBe(true);
  }
  // Nothing listed as shown elsewhere has quietly gained a page of its own.
  for (const file of Object.keys(ELSEWHERE))
    expect(
      pages.some((p) => p.component === file),
      `${file} has a page now`,
    ).toBe(false);
});

for (const { id } of pages.filter((p) => p.id.startsWith('components/'))) {
  test(`/${id}/: every prop in the table says what it does`, async ({ page }) => {
    await page.goto(`/${id}/`);
    for (const row of await page.locator('.ds-props tbody tr').all()) {
      const name = await row.locator('td').first().textContent();
      await expect(row.locator('td.wide'), `${id}: ${name?.trim()}`).not.toBeEmpty();
    }
  });
}

test('"used in" is worked out from the site\'s imports, naming places by their own pages', async ({
  page,
}) => {
  await page.goto('/components/button/');
  const used = page.locator('.ds-facts div', { hasText: 'used in' }).locator('dd');
  for (const place of ['nav', 'hero', 'booking band', 'consent', '404'])
    await expect(used).toContainText(place);
  await expect(
    page.locator('.ds-facts div', { hasText: 'source' }).getByRole('link'),
  ).toHaveAttribute(
    'href',
    'https://github.com/harrison-jennings/harrisonjennings.au/blob/main/src/components/Button.astro',
  );
});

test('a component page ends with related pages, listed in "on this page"', async ({ page }) => {
  await page.goto('/components/button/');
  await expect(page.locator('.ds-toc').getByRole('link', { name: 'related' })).toBeVisible();
  const cards = page.locator('#related + .ds-cards .ds-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toHaveAttribute('href', '/components/text-link/');
});

test("the share card page shows real cards, rendered by the site's own code", async ({
  request,
}) => {
  for (const kind of ['home', 'post', 'project', 'page']) {
    const png = await request.get(`/share-cards/${kind}.png`);
    expect(png.headers()['content-type']).toBe('image/png');
    const body = await png.body();
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
  }
});

test('the phone menu specimen opens the menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/specimens/mobile-menu/');
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
});

test("a preview's links don't load another page into the frame", async ({ page }) => {
  await page.goto('/components/mobile-menu/');
  const pf = page.locator('.pf').first();
  await pf.locator('[data-tall]').click();
  const menu = pf
    .frameLocator('.pf-view:not([hidden]) iframe')
    .getByRole('dialog', { name: 'Menu' });
  await menu.getByRole('link', { name: 'blog' }).click();
  await page.waitForTimeout(500);
  const frame = page.frames().find((f) => f.url().includes('/specimens/'));
  expect(frame?.url()).toContain('/specimens/mobile-menu/');
});

test('page-level examples fit their frame, with nothing cut off', async ({ page }) => {
  for (const name of ['footer', 'author-panel', 'keep-reading', 'post-header']) {
    await page.goto(`/specimens/${name}/`);
    const { body, content } = await page.evaluate(() => ({
      body: document.body.scrollHeight,
      content: Math.max(
        ...[...document.body.children].map((c) => c.getBoundingClientRect().bottom),
      ),
    }));
    expect(body, name).toBeGreaterThanOrEqual(Math.floor(content));
  }
});
