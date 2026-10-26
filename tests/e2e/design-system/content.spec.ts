import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { parse } from 'yaml';

// The content pages (design-system/src/content/docs/content): every VS Code snippet is shown on one, so
// a new snippet can't go undocumented, and the front matter reference lists exactly the posts schema's
// fields, read from the code.

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const DOCS = 'design-system/src/content/docs/content';

const pages = readdirSync(join(ROOT, DOCS))
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => {
    const text = read(`${DOCS}/${f}`);
    const front = parse(text.slice(4, text.indexOf('\n---', 4))) as { snippets?: string[] };
    return { id: `content/${f.replace(/\.mdx$/, '')}`, snippets: front.snippets ?? [] };
  });

test('every VS Code snippet is shown on a content page', () => {
  const snippets = Object.keys(
    JSON.parse(read('frontmatter.json'))['frontMatter.content.snippets'],
  );
  const shown = new Set(pages.flatMap((p) => p.snippets));
  const missing = snippets.filter((s) => !shown.has(s));
  expect(missing, `no content page names: ${missing.join(', ')}`).toEqual([]);
});

test('a content page says where to find its snippet in VS Code', async ({ page }) => {
  await page.goto('/content/callouts/');
  await expect(page.locator('.ds-facts div', { hasText: 'in VS Code' })).toContainText(
    'Insert snippet › callout',
  );
  await page.goto('/content/images/');
  await expect(page.locator('.ds-facts div', { hasText: 'in VS Code' })).toContainText(
    'Media › image',
  );
});

test("the front matter reference lists exactly the posts schema's fields, in order", async ({
  page,
}) => {
  // The posts schema's top-level fields, from src/content.config.ts.
  const config = read('src/content.config.ts');
  const block = config.slice(
    config.indexOf('const posts'),
    config.indexOf('\n});', config.indexOf('const posts')),
  );
  const fields = [...block.matchAll(/^ +(\w+): (?:z\.|image\(|reference\()/gm)].map((m) => m[1]);
  expect(fields.length).toBeGreaterThan(10);

  await page.goto('/content/front-matter/');
  const rows = page.locator('.ds-fields tbody tr td:first-child');
  await expect(rows).toHaveText(fields as string[]);
  // Required as the schema says: the three without .optional() or .default(), and coverAlt with a cover.
  for (const name of ['title', 'description', 'published'])
    await expect(
      page
        .locator('.ds-fields tbody tr', { hasText: new RegExp(`^${name}`) })
        .locator('td')
        .nth(1),
    ).toHaveText('yes');
  await expect(
    page
      .locator('.ds-fields tbody tr', { hasText: /^coverAlt/ })
      .locator('td')
      .nth(1),
  ).toHaveText('with cover');
});

test('the full example is the newest post, as written', async ({ page }) => {
  await page.goto('/content/front-matter/');
  const code = page.locator('.pf--code [data-code]').first();
  await expect(code).toHaveAttribute('data-code', /^---\ntitle: /);
});
