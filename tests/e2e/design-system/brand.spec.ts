import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { parse } from 'yaml';
import { designPages } from './site';

// The overview, brand and foundations pages (design-system/src/content/docs/brand, …/foundations):
// what they show comes from the code (tokens.json, the site's components), so these check it against
// the code rather than against numbers typed in here.

const read = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');
const tokens = JSON.parse(read('design/tokens.json'));

const COUNTS: Record<string, number> = {
  colour: tokens.color.tokens.length,
  font: Object.keys(tokens.type.families).length,
  type: tokens.type.groups.reduce((n: number, g: { styles: unknown[] }) => n + g.styles.length, 0),
  spacing: tokens.spacing.tokens.length,
  radius: tokens.radius.tokens.length,
  size: tokens.size.tokens.length,
  shadow: tokens.shadow.tokens.length,
  motion: tokens.motion.tokens.length,
};
const ALL = Object.values(COUNTS).reduce((a, b) => a + b, 0);

/** WCAG contrast of two #rrggbb colours, worked out here independently of the design system's own. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r ?? 0) + 0.7152 * lin(g ?? 0) + 0.0722 * lin(bl ?? 0);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
const colour = (name: string, theme: 'dark' | 'light'): string =>
  tokens.color.tokens.find((t: { name: string }) => t.name === name).value[theme];

test.describe('the token table', () => {
  test('its filters show each kind, with counts that match tokens.json, colour first', async ({
    page,
  }) => {
    await page.goto('/foundations/tokens/');
    const filters = page.getByRole('group', { name: 'Filter tokens' });
    const rows = page.locator('[data-token-table] tbody tr:not([hidden])');
    await expect(filters.getByRole('button', { name: /^colour/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(rows).toHaveCount(COUNTS['colour'] ?? 0);

    for (const [kind, count] of [...Object.entries(COUNTS), ['all', ALL] as const]) {
      const button = filters.getByRole('button', { name: new RegExp(`^${kind}\\b`) });
      await expect(button).toContainText(String(count));
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(rows).toHaveCount(count);
      await expect(page).toHaveURL(new RegExp(`\\?kind=${kind}$`));
    }
  });

  test('a link can point at a filter', async ({ page }) => {
    await page.goto('/foundations/tokens/?kind=motion');
    await expect(page.getByRole('button', { name: /^motion/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('[data-token-table] tbody tr:not([hidden])')).toHaveCount(
      COUNTS['motion'] ?? 0,
    );
  });

  test('its values are the ones in tokens.json, in both themes', async ({ page }) => {
    await page.goto('/foundations/tokens/');
    const ground = page.locator('[data-token-table] tbody tr', { hasText: 'var(--ground)' });
    await expect(ground).toContainText(new RegExp(`dark\\s*${colour('ground', 'dark')}`));
    await expect(ground).toContainText(new RegExp(`light\\s*${colour('ground', 'light')}`));
  });
});

test('copy chips copy the token, and say so', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/brand/colour/');
  const chip = page.locator('.ds-chipcopy[data-copy-text="var(--accent)"]');
  await chip.click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('var(--accent)');
  await expect(chip).toContainText('copied');
  await expect(chip).toContainText('--accent', { timeout: 3000 });

  await page.goto('/brand/typography/');
  await page.locator('.ds-chipcopy[data-copy-text=".type-heading-2"]').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('.type-heading-2');
});

test('contrast ratios are worked out from tokens.json, and a failure says so', async ({ page }) => {
  await page.goto('/brand/colour/');
  for (const [fg, bg] of [
    ['text', 'ground'],
    ['accent', 'ground'],
    ['accent', 'surface'],
    ['on-accent', 'accent'],
  ] as const) {
    const pair = page.locator(`.cp[data-pair="${fg} on ${bg}"]`);
    const ratios = pair.locator('.cp__ratio');
    const badges = pair.locator('.cp__badge');
    for (const [i, theme] of (['dark', 'light'] as const).entries()) {
      const r = contrast(colour(fg, theme), colour(bg, theme));
      await expect(ratios.nth(i)).toHaveText(`${(Math.round(r * 100) / 100).toFixed(2)}:1`);
      await expect(badges.nth(i)).toHaveText(r >= 4.5 ? 'passes AA' : 'below AA');
    }
  }
  // The one the colour rules warn about.
  await expect(page.locator('.cp[data-pair="accent on surface"] .cp__badge').first()).toHaveText(
    'below AA',
  );
});

test('the palette shows every colour in tokens.json, in both themes', async ({ page }) => {
  await page.goto('/brand/colour/');
  await expect(page.locator('.sw-row')).toHaveCount(COUNTS['colour'] ?? 0);
  const accent = page.locator('.sw-row', { hasText: '--accent' });
  await expect(accent.locator('.sw-chip').first()).toHaveCSS(
    'background-image',
    /rgb\(200, 90, 82\)/,
  );
});

test('the type scale shows every type style, each set in its own class', async ({ page }) => {
  await page.goto('/brand/typography/');
  const samples = page.locator('.ty-scale__sample');
  await expect(samples).toHaveCount(COUNTS['type'] ?? 0);
  await expect(page.locator('.ty-scale__sample.type-heading-2')).toHaveCSS('font-size', '26px');
});

test('the logo page shows every size the site draws the mark at', async ({ page }) => {
  await page.goto('/brand/logo/');
  // Each <Logo size={…}> in src/, and the compact nav's 24px.
  const sizes = new Set(
    [
      ...read('src/components/Nav.astro').matchAll(/<Logo\b[^>]*size=\{(\d+)\}/g),
      ...read('src/components/Footer.astro').matchAll(/<Logo\b[^>]*size=\{(\d+)\}/g),
      ...read('src/components/home/Booking.astro').matchAll(/<Logo\b[^>]*size=\{(\d+)\}/g),
      ...read('src/components/blog/AuthorPanel.astro').matchAll(/<Logo\b[^>]*size=\{(\d+)\}/g),
    ].map((m) => Number(m[1])),
  );
  sizes.add(24);
  const shown = page.locator('.lg-sizes figcaption');
  for (const size of sizes) await expect(shown.filter({ hasText: `${size}px` })).not.toHaveCount(0);
});

test("the compact nav's mark has the nav's weight, as it's the nav's drawing made smaller", async ({
  page,
}) => {
  await page.goto('/brand/logo/');
  const weight = async (where: string | RegExp) =>
    (await page.locator('.lg-sizes figcaption').filter({ hasText: where }).innerText()).split(
      '\n',
    )[1];
  expect(await weight('compact nav')).toBe(await weight(/^26px/));
  await expect(
    page.locator('.lg-sizes figure').filter({ hasText: 'compact nav' }).locator('svg'),
  ).toHaveAttribute('width', '26');
});

test('a "don\'t" example is a picture: hidden from screen readers and the keyboard', async ({
  page,
}) => {
  await page.goto('/brand/voice-and-tone/');
  const wrong = page.locator('.dd-card--dont .dd-card__ex');
  await expect(wrong.first()).toHaveAttribute('aria-hidden', 'true');
  for (const ex of await wrong.all()) await expect(ex).toHaveAttribute('inert', '');
});

test('the downloads are the real files', async ({ request }) => {
  const css = await request.get('/tokens.css');
  expect(css.headers()['content-type']).toContain('text/css');
  expect(await css.text()).toBe(read('src/styles/tokens.css'));
  const json = await request.get('/tokens.json');
  expect(JSON.parse(await json.text())).toEqual(tokens);
  for (const mark of ['mark-on-dark', 'mark-on-light']) {
    const png = await request.get(`/brand/${mark}.png`);
    expect(png.headers()['content-type']).toBe('image/png');
    const body = await png.body();
    // A PNG, 1024 × 1024 (the width and height in its header).
    expect(body.subarray(1, 4).toString()).toBe('PNG');
    expect(body.readUInt32BE(16)).toBe(1024);
    expect(body.readUInt32BE(20)).toBe(1024);
    expect((await request.get(`/brand/${mark}.svg`)).status()).toBe(200);
  }
  for (const icon of ['/favicon.svg', '/favicon.ico', '/icon-192.png', '/icon-512.png'])
    expect((await request.get(icon)).status()).toBe(200);
});

test('every download link is a real link that says which file it is', async ({ page }) => {
  await page.goto('/brand/logo/');
  await expect(page.getByRole('link', { name: 'download mark on dark as png' })).toHaveAttribute(
    'href',
    '/brand/mark-on-dark.png',
  );
  await page.goto('/foundations/tokens/');
  await expect(page.getByRole('link', { name: 'download tokens.json' })).toHaveAttribute(
    'download',
    '',
  );
});

test.describe('the overview', () => {
  test('counts the tokens, and lists the sections with their pages', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.ds-stats div', { hasText: 'design tokens' })).toContainText(
      String(ALL),
    );
    const brand = page.locator('.ds-card', { hasText: /^brand/ });
    await expect(brand).toHaveAttribute('href', '/brand/logo/');
    const brandPages = designPages().filter((p) => p.startsWith('/brand/')).length;
    await expect(brand).toContainText(`${brandPages} pages`);
  });

  test('"what changed" is the content file, each row linked to its pull request', async ({
    page,
  }) => {
    const changes = parse(read('design-system/src/content/changes.yaml')) as {
      line: string;
      pr: number;
    }[];
    await page.goto('/');
    const rows = page.locator('.ds-rows li');
    await expect(rows).toHaveCount(changes.length);
    const first = changes[0];
    if (!first) throw new Error('changes.yaml is empty');
    await expect(rows.first()).toContainText(first.line);
    await expect(rows.first().getByRole('link')).toHaveAttribute(
      'href',
      `https://github.com/harrison-jennings/harrisonjennings.au/pull/${first.pr}`,
    );
  });
});

// Every preview on every page loads its specimen, at both widths.
for (const width of [1440, 390]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const path of designPages()) {
      test(`${path}: every preview loads`, async ({ page }) => {
        await page.goto(path);
        const frames = page.locator('.pf-view:not([hidden]) .pf-vp');
        for (const vp of await frames.all()) {
          // The height is set once the specimen reports it (preview.ts).
          await expect.poll(() => vp.evaluate((el) => el.style.height)).toMatch(/^\d+px$/);
          await expect(vp).toBeVisible();
        }
        await expect(page.locator('.pf-error:not([hidden])')).toHaveCount(0);
      });
    }
  });
}
