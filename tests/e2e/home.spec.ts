import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const testimonials = (
  readFileSync(new URL('../../src/content/testimonials.yaml', import.meta.url), 'utf8').match(
    /^- id:/gm,
  ) ?? []
).length;

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the hero: headline, stop, field and actions', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('marketing, engineered');
    await expect(page.locator('[data-hero-stop]')).toBeVisible();
    await expect(page.locator('[data-hero-field]')).toHaveAttribute('aria-hidden', 'true');
    const actions = page.locator('.hero__actions');
    await expect(actions.getByRole('link', { name: 'read the blog' })).toHaveAttribute(
      'href',
      '/blog/',
    );
    await expect(actions.getByRole('link', { name: 'book a call' })).toHaveAttribute(
      'href',
      '/#book',
    );
  });

  test('the scroll cue fades out over the first 160px', async ({ page }) => {
    await page.goto('/');
    const cue = page.locator('[data-cue]');
    await expect(cue).toHaveCSS('opacity', '1');
    await page.evaluate(() => window.scrollTo(0, 80));
    await expect
      .poll(() => cue.evaluate((c) => Number(getComputedStyle(c).opacity)))
      .toBeCloseTo(0.5, 1);
    await page.evaluate(() => window.scrollTo(0, 200));
    await expect.poll(() => cue.evaluate((c) => getComputedStyle(c).opacity)).toBe('0');
  });

  test('what I do: every tools line starts level', async ({ page }) => {
    await page.goto('/');
    const tops = await page
      .locator('.services .tools')
      .evaluateAll((lists) => lists.map((l) => Math.round(l.getBoundingClientRect().top)));
    expect(tops.length).toBe(3);
    expect(new Set(tops).size).toBe(1);
  });

  test('built and shipped: tabs switch projects by click and keyboard', async ({ page }) => {
    await page.goto('/');
    const tabs = page.locator('[data-switch] [role="tab"]');
    const count = await tabs.count();
    test.skip(count < 2, 'needs two featured projects');
    const selected = () => page.locator('[data-switch] [role="tab"][aria-selected="true"]');
    const visiblePane = () => page.locator('[data-switch] [role="tabpanel"]:not([hidden])');

    await expect(selected()).toHaveCount(1);
    await expect(tabs.nth(0)).toHaveAttribute('tabindex', '0');
    await expect(tabs.nth(1)).toHaveAttribute('tabindex', '-1');

    await tabs.nth(0).focus();
    await page.keyboard.press('ArrowDown');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(visiblePane()).toHaveAttribute(
      'aria-labelledby',
      (await tabs.nth(1).getAttribute('id'))!,
    );

    await page.keyboard.press('Home');
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(tabs.nth(count - 1)).toHaveAttribute('aria-selected', 'true');

    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(visiblePane()).toHaveCount(1);
  });

  test(`what people are saying: ${testimonials >= 5 ? 'a moving row with a pause button' : 'still cards side by side'}`, async ({
    page,
  }) => {
    await page.goto('/');
    const section = page.locator('section[aria-labelledby="what-people-are-saying"]');
    if (testimonials >= 5) {
      const pause = section.locator('[data-pause]');
      await pause.click();
      await expect(pause).toHaveAttribute('aria-pressed', 'true');
      await expect(pause).toHaveAccessibleName('Play testimonials');
      await expect(section.locator('[data-ticker]')).toHaveAttribute('data-paused', 'true');
    } else {
      await expect(section.locator('[data-ticker]')).toHaveCount(0);
      await expect(section.locator('[data-pause]')).toHaveCount(0);
      await expect(section.locator('.quote')).toHaveCount(testimonials);
    }
  });
});

/** Requests to anywhere other than the site itself. */
const thirdParty = (page: Page) => {
  const own = new URL(test.info().project.use.baseURL ?? 'http://127.0.0.1').origin;
  const requests: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.protocol.startsWith('http') && url.origin !== own) requests.push(r.url());
  });
  return requests;
};

test('nothing third-party loads with the page', async ({ page }) => {
  const requests = thirdParty(page);
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  expect(requests).toEqual([]);
});

test('the booking calendar opens in the band and only then loads Cal.com', async ({ page }) => {
  await page.route('https://app.cal.com/**', (route) => route.abort());
  const requests = thirdParty(page);
  await page.goto('/');
  const toggle = page.locator('[data-book-toggle]');
  const panel = page.locator('[data-book-cal]');
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(requests).toEqual([]);

  await toggle.click();
  await expect(panel).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAccessibleName('hide availability');
  await expect(panel.getByRole('status')).toContainText('loading the booking calendar');
  await expect
    .poll(() => requests.some((u) => u.startsWith('https://app.cal.com/embed/embed.js')))
    .toBe(true);

  await toggle.click();
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAccessibleName('view availability');

  // Cal.com's embed turns any [data-cal-link] element into a popup trigger; nothing of ours may have it.
  await expect(page.locator('[data-cal-link]')).toHaveCount(0);
});

test('every book a call stays on the site', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('a', { hasText: 'book a call' });
  expect(await links.count()).toBeGreaterThanOrEqual(3);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute('href', '/#book');
    await expect(link).not.toHaveAttribute('target', '_blank');
  }
});

test(
  'on the home page, book a call scrolls to the band and opens its calendar',
  { tag: '@desktop' },
  async ({ page }) => {
    await page.route('https://app.cal.com/**', (route) => route.abort());
    await page.goto('/');
    await page.locator('.nav [data-book-call]').click();
    await expect(page.locator('[data-book-cal]')).toBeVisible();
    await expect(page.locator('[data-book-toggle]')).toBeFocused();
    await expect(page).toHaveURL(/#book$/);
    // Clear of the floating nav.
    await expect
      .poll(async () => Math.round((await page.locator('[data-book]').boundingBox())!.y))
      .toBeGreaterThanOrEqual(82);
  },
);

test(
  'elsewhere, book a call opens the calendar over the page',
  { tag: '@desktop' },
  async ({ page }) => {
    await page.route('https://app.cal.com/**', (route) => route.abort());
    const requests = thirdParty(page);
    await page.goto('/does-not-exist/');
    await page.locator('.nav [data-book-call]').click();
    await expect
      .poll(() => requests.some((u) => u.startsWith('https://app.cal.com/embed/embed.js')))
      .toBe(true);
    await expect(page).toHaveURL(/\/does-not-exist\/$/);
  },
);

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('what I do swipes one card per arrow press, with the ends marked', async ({ page }) => {
    await page.goto('/');
    const row = page.locator('[data-swipe="services"]');
    const prev = page.locator('[data-swipe-prev="services"]');
    const next = page.locator('[data-swipe-next="services"]');
    await expect(prev).toHaveAttribute('aria-disabled', 'true');
    await expect(next).toHaveAttribute('aria-disabled', 'false');
    // It scrolls and holds no links, so it's a labelled region a keyboard can reach.
    await expect(row).toHaveAttribute('role', 'region');
    await expect(row).toHaveAttribute('tabindex', '0');

    await next.click();
    await expect.poll(() => row.evaluate((r) => r.scrollLeft)).toBeGreaterThan(200);
    await expect(prev).toHaveAttribute('aria-disabled', 'false');
    await next.click();
    await expect(next).toHaveAttribute('aria-disabled', 'true');
  });

  test('the project switcher becomes full-width cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-switch]')).toBeHidden();
    const card = page.locator('.pcard').first();
    await expect(card).toBeVisible();
    const row = (await page.locator('[data-swipe="projects"]').boundingBox())!;
    const box = (await card.boundingBox())!;
    expect(Math.round(box.width)).toBe(Math.round(row.width - 40));
  });

  test('the hero buttons stack: book a call full width, the blog link under it', async ({
    page,
  }) => {
    await page.goto('/');
    const button = (await page.locator('.hero__actions .btn').boundingBox())!;
    const link = (await page.locator('.hero__actions .link').boundingBox())!;
    expect(link.y).toBeGreaterThan(button.y + button.height);
    expect(Math.round(button.width)).toBe(390 - 38 - 26);
  });
});
