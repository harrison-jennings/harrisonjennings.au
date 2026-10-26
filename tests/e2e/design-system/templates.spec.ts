import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { parse } from 'yaml';

// The templates gallery (/templates/all-templates/): every template in templates.yaml has its four
// thumbnails (npm run design:shots) and no stale ones are left; the gallery keeps the file's order,
// switches the thumbnails' theme, and opens the live pages.

const root = new URL('../../../', import.meta.url);
const templates = parse(
  readFileSync(new URL('design-system/src/content/templates.yaml', root), 'utf8'),
) as { id: string; name: string; path: string }[];
const SHOTS = ['dark-desktop', 'dark-phone', 'light-desktop', 'light-phone'];

test('every template has its four thumbnails, and there are no others', () => {
  const files = readdirSync(fileURLToPath(new URL('design-system/public/templates/', root)));
  const expected = templates.flatMap(({ id }) => SHOTS.map((s) => `${id}-${s}.webp`)).sort();
  expect(files.filter((f) => f.endsWith('.webp')).sort()).toEqual(expected);
});

test('the gallery shows every template in order, each opening the live page', async ({ page }) => {
  await page.goto('/templates/all-templates/');
  const cards = page.locator('.tp');
  await expect(cards.locator('.tp__text b')).toHaveText(templates.map((t) => t.name));
  const first = templates[0];
  if (!first) throw new Error('templates.yaml is empty');
  await expect(cards.first().getByRole('link', { name: /open live/ })).toHaveAttribute(
    'href',
    new URL(first.path, 'https://www.harrisonjennings.au').href,
  );
});

test("the thumbnails follow the page's theme until one is picked", async ({ page }) => {
  await page.goto('/templates/all-templates/');
  const grid = page.locator('.tp-grid');
  const desk = page.locator('.tp').first().locator('.tp__desk img:visible');
  await expect(grid).toHaveAttribute('data-thumbs', 'dark');
  await expect(desk).toHaveAttribute('src', /-dark-desktop\.webp$/);
  await page
    .getByRole('group', { name: 'Thumbnail theme' })
    .getByRole('button', { name: 'light' })
    .click();
  await expect(desk).toHaveAttribute('src', /-light-desktop\.webp$/);
  // Picked: the page's own theme no longer leads.
  await page.locator('html').evaluate((el) => (el.dataset['theme'] = 'dark'));
  await expect(grid).toHaveAttribute('data-thumbs', 'light');
});
