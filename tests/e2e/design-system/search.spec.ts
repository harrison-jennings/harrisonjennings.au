import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Search (design-system/src/components/Search.astro, scripts/search.ts and scripts/arrive.ts), against
// the real index the build writes: opening it, the keyboard, results, a token's card, the states, and
// what happens on the page a result opens.

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const tokens = JSON.parse(
  readFileSync(new URL('../../../design/tokens.json', import.meta.url), 'utf8'),
);
const accent = tokens.color.tokens.find((t: { name: string }) => t.name === 'accent').value;

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Search the design system' });
const field = (page: Page) => dialog(page).getByRole('combobox');
const selected = (page: Page) => dialog(page).locator('[role="option"][aria-selected="true"]');

/** Opens search with `/` and types a query, waiting for its results to show. */
async function search(page: Page, query: string) {
  await page.keyboard.press('/');
  await expect(field(page)).toBeFocused();
  await field(page).fill(query);
}

test.describe('opening and closing', () => {
  test('/ and ⌘K or Ctrl K open it from anywhere, and Esc clears the field, then closes', async ({
    page,
  }) => {
    await page.goto('/components/button/');
    await page.keyboard.press('/');
    await expect(dialog(page)).toBeVisible();
    await expect(field(page)).toBeFocused();
    await field(page).fill('button');
    await page.keyboard.press('Escape');
    await expect(field(page)).toHaveValue('');
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();

    await page.keyboard.press('ControlOrMeta+k');
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
  });

  test('the header button opens it, and closing returns focus there', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/components/button/');
    const button = page.locator('.ds-search');
    await button.click();
    await expect(field(page)).toBeFocused();
    await dialog(page).getByRole('button', { name: 'Close search' }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(button).toBeFocused();
  });

  test('before typing: the six sections, and the pages used most, the first selected', async ({
    page,
  }) => {
    await page.goto('/');
    await page.keyboard.press('/');
    const sections = dialog(page).locator('[data-view="start"] .sr-chip');
    await expect(sections).toHaveText([
      'overview',
      'brand',
      'foundations',
      'components',
      'content',
      'templates',
    ]);
    await expect(selected(page)).toHaveAccessibleName(/^callouts content \/ text/);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/content\/callouts\/$/);
  });

  test("without JavaScript there's no way in", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/components/button/');
    await expect(page.locator('[data-search-open]')).toHaveCount(3);
    for (const way of await page.locator('[data-search-open]').all())
      await expect(way).toBeHidden();
    await context.close();
  });
});

test.describe('results', () => {
  test('"callout" finds the callouts page first, and Enter opens it', async ({ page }) => {
    await page.goto('/components/button/');
    await search(page, 'callout');
    const first = dialog(page).locator('[data-view="results"] .sr-res').first();
    await expect(first).toHaveAccessibleName(/^callouts content \/ text/);
    await expect(dialog(page).locator('[data-search-count]')).toHaveText(
      /^\d+ results? for “callout”$/,
    );
    await expect(first.locator('mark').first()).toBeVisible();
    await expect(selected(page)).toHaveAccessibleName(/^callouts content \/ text/);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/content\/callouts\/$/);
  });

  test('the arrows move through results and sections without wrapping', async ({ page }) => {
    await page.goto('/components/button/');
    await search(page, 'colour');
    await expect(dialog(page).locator('[data-view="results"] .sr-res').first()).toBeVisible();
    const options = dialog(page).locator('[data-view="results"] [role="option"]');
    const ids = await options.evaluateAll((all) => all.map((o) => o.id));
    await page.keyboard.press('ArrowUp');
    await expect(field(page)).toHaveAttribute('aria-activedescendant', ids[0] ?? '');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(field(page)).toHaveAttribute('aria-activedescendant', ids[2] ?? '');
    await expect(selected(page)).toHaveCount(1);
    await expect(field(page)).toBeFocused();
  });

  test('many results come eight pages at a time', async ({ page }) => {
    await page.goto('/components/button/');
    await search(page, 'colour');
    const pages = dialog(page).locator('.sr-group');
    await expect(pages).toHaveCount(8);
    const count = Number(
      (await dialog(page).locator('[data-search-count]').innerText()).split(' ')[0],
    );
    expect(count).toBeGreaterThan(8);
    await expect(dialog(page).getByRole('status')).toHaveText(`${count} results, showing 8`);
    const more = dialog(page).locator('[data-search-more] button');
    await expect(more).toContainText(`${count - 8} left`);
    await more.click();
    await expect(pages).toHaveCount(Math.min(16, count));
  });

  test('"carousel" finds nothing, and says what to try', async ({ page }) => {
    await page.goto('/components/button/');
    await search(page, 'carousel');
    await expect(dialog(page).getByText('nothing matches “carousel”.')).toBeVisible();
    await expect(dialog(page).getByRole('status')).toHaveText('No results');
    await expect(dialog(page).locator('[data-view="none"] .sr-chip')).toHaveCount(6);
  });

  test('gibberish finds nothing, though Pagefind would match the start of each word', async ({
    page,
  }) => {
    await page.goto('/components/button/');
    await search(page, 'asdflksjad f;lkjf sdf');
    await expect(dialog(page).getByText('nothing matches “asdflksjad f;lkjf sdf”.')).toBeVisible();
    // The next query replaces this one in the open field. Closing and reopening between them raced:
    // `/` sent straight after the closing Esc landed in the closed dialog's field, before focus left it.
    await field(page).fill('callout zzzz');
    await expect(dialog(page).getByText('nothing matches “callout zzzz”.')).toBeVisible();
  });

  test('a plural still finds its singular', async ({ page }) => {
    await page.goto('/components/button/');
    await search(page, 'colours');
    await expect(dialog(page).locator('[data-view="results"] .sr-res').first()).toBeVisible();
  });

  test('"--accent" shows the token card, with both themes\' values from tokens.json', async ({
    page,
  }) => {
    await page.goto('/components/button/');
    await search(page, '--accent');
    const card = dialog(page).locator('.sr-token');
    await expect(card).toBeVisible();
    await expect(card.getByRole('button', { name: /var\(--accent\)/ })).toBeVisible();
    await expect(card).toContainText(accent.dark);
    await expect(card).toContainText(accent.light);
    await expect(card.getByRole('link', { name: 'open in the token table' })).toHaveAttribute(
      'href',
      '/foundations/tokens/?kind=colour',
    );
    await expect(dialog(page).locator('[data-search-count]')).toHaveText(
      /^1 token, and \d+ pages? that mention it$/,
    );
    await expect(dialog(page).getByRole('status')).toHaveText(/^1 token and \d+ results?$/);
  });

  test('a failed index load offers "try again", which works once the index arrives', async ({
    page,
  }) => {
    await page.route('**/pagefind/**', (route) => route.abort());
    await page.goto('/components/button/');
    await search(page, 'callout');
    await expect(dialog(page).getByText("search couldn't load.")).toBeVisible();
    await expect(dialog(page).getByRole('status')).toHaveText("Search couldn't load");
    await page.unroute('**/pagefind/**');
    await dialog(page).getByRole('button', { name: 'try again' }).click();
    await expect(
      dialog(page).locator('[data-view="results"] .sr-res').first(),
    ).toHaveAccessibleName(/^callouts content \/ text/);
  });
});

test.describe('arriving on a result', () => {
  test('the matches are marked, the first scrolled to, and "clear" removes them', async ({
    page,
  }) => {
    await page.goto('/content/front-matter/?q=coverAlt');
    const marks = page.locator('mark.sr-hit');
    await expect(marks.first()).toBeInViewport();
    const pill = page.locator('[data-arrive]');
    await expect(pill).toContainText(/coverAlt is marked (once|\d+ times)/);
    // The query leaves the address at once, so a reload doesn't bring the marks back.
    await expect(page).toHaveURL(/\/content\/front-matter\/$/);
    await pill.getByRole('button', { name: 'clear' }).click();
    await expect(marks).toHaveCount(0);
    await expect(pill).toBeHidden();
  });

  test('Esc clears the marks too', async ({ page }) => {
    await page.goto('/content/callouts/?q=callout');
    await expect(page.locator('mark.sr-hit').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('mark.sr-hit')).toHaveCount(0);
  });

  test('a match in a hidden kind of token shows that kind', async ({ page }) => {
    await page.goto('/foundations/tokens/?q=duration-move');
    await expect(page.getByRole('button', { name: /^motion/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('mark.sr-hit').first()).toBeInViewport();
  });
});

for (const { name, width, height } of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
]) {
  test.describe(`at ${name} width`, () => {
    test.use({ viewport: { width, height } });

    for (const theme of ['dark', 'light'] as const) {
      test(`search open with results has no axe violations in ${theme}`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem('hj-theme', t), theme);
        await page.goto('/components/button/');
        await page.evaluate(() => document.fonts.ready);
        await search(page, 'callout');
        await expect(dialog(page).locator('[data-view="results"] .sr-res').first()).toBeVisible();
        const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
        const summary = violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        );
        expect(summary, summary.join('\n')).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          width,
        );
      });
    }
  });
}

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('it fills the screen, from the header button', async ({ page }) => {
    await page.goto('/components/button/');
    await page
      .getByRole('banner')
      .getByRole('button', { name: 'Search the design system' })
      .click();
    await expect(field(page)).toBeFocused();
    const box = await dialog(page).boundingBox();
    expect(box?.width).toBeCloseTo(390, 0);
    expect(box?.height).toBeCloseTo(844, 0);
  });

  test('from the menu, cancel goes back to the menu with search focused', async ({ page }) => {
    await page.goto('/components/button/');
    await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click();
    const menu = page.getByRole('dialog', { name: 'Menu' });
    await menu.getByRole('button', { name: 'search' }).click();
    await expect(menu).toBeHidden();
    await expect(field(page)).toBeFocused();
    await dialog(page).getByRole('button', { name: 'cancel' }).click();
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: 'search' })).toBeFocused();
  });
});
