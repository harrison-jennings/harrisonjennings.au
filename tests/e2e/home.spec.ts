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

// "still shipping": the contributions graph, built from tests/e2e/fixtures/contributions.json
// (CONTRIBUTIONS_FIXTURE, set by npm run test:e2e): 365 days ending on 11 November 2026.
test.describe('still shipping', () => {
  const section = (page: Page) => page.locator('section[aria-labelledby="still-shipping"]');
  const day = (page: Page, label: string) =>
    section(page).locator(`.act__day[aria-label="${label}"]`);
  const tip = (page: Page) => section(page).locator('.act__tip');

  test('a year of days, after built and shipped', async ({ page }) => {
    await page.goto('/');
    await expect(section(page).locator('.act__day')).toHaveCount(365);
    await expect(section(page).locator('h2')).toHaveText('still shipping');
    await expect(section(page).locator('.act__summary')).toHaveText(
      '601 contributions on GitHub in the last year, 278 of them in private repositories.',
    );
    // "built and shipped" has a heading for each layout; each title once, in page order.
    const order = [
      ...new Set(
        await page.locator('section h2').evaluateAll((hs) => hs.map((h) => h.textContent?.trim())),
      ),
    ];
    expect(order.indexOf('still shipping')).toBe(order.indexOf('built and shipped') + 1);
  });

  test.describe('desktop', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('hovering a day shows its count and date', { tag: '@desktop' }, async ({ page }) => {
      await page.goto('/');
      for (const label of [
        '16 contributions on 8 November',
        '49 contributions on 9 November',
        'no contributions on 10 November',
      ]) {
        await day(page, label).hover();
        await expect(tip(page)).toBeVisible();
        await expect(tip(page)).toHaveText(label);
      }
      await page.keyboard.press('Escape');
      await expect(tip(page)).toBeHidden();
    });

    test(
      'the tooltip stays inside the column at both ends',
      { tag: '@desktop' },
      async ({ page }) => {
        await page.goto('/');
        const act = (await section(page).locator('.act').boundingBox())!;
        for (const label of [
          '49 contributions on 9 November',
          'no contributions on 12 November 2025',
        ]) {
          await day(page, label).hover();
          const box = (await tip(page).boundingBox())!;
          expect(box.x).toBeGreaterThanOrEqual(act.x - 0.5);
          expect(box.x + box.width).toBeLessThanOrEqual(act.x + act.width + 0.5);
        }
      },
    );

    test(
      'the grid is one tab stop: Tab lands on today, the arrow keys move',
      { tag: '@keyboard' },
      async ({ page }) => {
        await page.goto('/');
        await section(page).locator('.section__head a').focus();
        await page.keyboard.press('Tab');
        const today = day(page, '5 contributions on 11 November');
        await expect(today).toBeFocused();
        await expect(tip(page)).toHaveText('5 contributions on 11 November');

        await page.keyboard.press('ArrowUp');
        await expect(day(page, 'no contributions on 10 November')).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(tip(page)).toBeHidden();
        await page.keyboard.press('ArrowUp');
        await expect(tip(page)).toHaveText('49 contributions on 9 November');

        // The first day, then a week on: the same weekday in the next column.
        await page.keyboard.press('Control+Home');
        const first = day(page, 'no contributions on 12 November 2025');
        await expect(first).toBeFocused();
        await page.keyboard.press('ArrowRight');
        await expect(section(page).locator('.act__day:focus')).toHaveAttribute(
          'aria-label',
          /on 19 November 2025$/,
        );
        await page.keyboard.press('Control+End');
        await expect(today).toBeFocused();
        // Only one day is ever in the tab order.
        await expect(section(page).locator('.act__day[tabindex="0"]')).toHaveCount(1);
      },
    );

    test('it plays its entrance once it scrolls into view', async ({ page }) => {
      await page.goto('/');
      const act = section(page).locator('.act');
      await expect(act).toHaveAttribute('data-reveal', 'armed');
      await section(page).scrollIntoViewIfNeeded();
      await expect(act).toHaveAttribute('data-reveal', 'play');
      await expect(act).not.toHaveAttribute('data-reveal', /.*/, { timeout: 3_000 });
    });
  });

  test('under reduced motion it never arms the entrance', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${test.info().project.use.baseURL}/`);
    await section(page).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(section(page).locator('.act')).not.toHaveAttribute('data-reveal', /.*/);
    await context.close();
  });

  test('between phone and desktop, the year scrolls with arrows', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.goto('/');
    await expect(section(page).locator('[data-swipe-next="activity"]')).toBeVisible();
    await expect(section(page).locator('[data-swipe-next="activity"]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  test.describe('phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('it opens at the newest weeks, a whole week beside the day labels', async ({ page }) => {
      await page.goto('/');
      await section(page).scrollIntoViewIfNeeded();
      const scroller = section(page).locator('.act__scroll');
      await expect
        .poll(() => scroller.evaluate((s) => s.scrollWidth - s.clientWidth - s.scrollLeft))
        .toBeLessThanOrEqual(1);
      await expect(day(page, '5 contributions on 11 November')).toBeInViewport();
      await expect(section(page).locator('[data-swipe-next="activity"]')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      // Nothing but the grid scrolls sideways.
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

      await section(page).locator('[data-swipe-prev="activity"]').click();
      await expect
        .poll(() => scroller.evaluate((s) => s.scrollWidth - s.clientWidth - s.scrollLeft))
        .toBeGreaterThan(200);
    });

    test('it opens at the newest weeks after growing from desktop to phone width', async ({
      page,
    }) => {
      // As in the design system's preview frame, which starts at desktop width.
      await page.setViewportSize({ width: 1280, height: 844 });
      await page.goto('/');
      await page.setViewportSize({ width: 390, height: 844 });
      await section(page).scrollIntoViewIfNeeded();
      const scroller = section(page).locator('.act__scroll');
      await expect
        .poll(() => scroller.evaluate((s) => s.scrollWidth - s.clientWidth - s.scrollLeft))
        .toBeLessThanOrEqual(1);
      expect(await scroller.evaluate((s) => s.scrollLeft)).toBeGreaterThan(200);
    });

    test('a browser restoring an old position on reload is undone; a visitor’s scroll isn’t', async ({
      page,
    }) => {
      await page.goto('/');
      await section(page).scrollIntoViewIfNeeded();
      const scroller = section(page).locator('.act__scroll');
      const fromEnd = () => scroller.evaluate((s) => s.scrollWidth - s.clientWidth - s.scrollLeft);
      // A restore is a scroll with no swipe, wheel, key or arrow press behind it.
      await scroller.evaluate((s) => (s.scrollLeft = 100));
      await expect.poll(fromEnd).toBeLessThanOrEqual(1);
      await section(page).locator('[data-swipe-prev="activity"]').click();
      await expect.poll(fromEnd).toBeGreaterThan(200);
      await page.waitForTimeout(600);
      expect(await fromEnd()).toBeGreaterThan(200);
    });

    test('the weeks stay inside the column, with no dot cut at either edge', async ({ page }) => {
      await page.goto('/');
      await section(page).scrollIntoViewIfNeeded();
      const edges = () =>
        section(page).evaluate((s) => {
          const view = s.querySelector('.act__scroll')!.getBoundingClientRect();
          const column = s.querySelector('.act')!.getBoundingClientRect();
          const start = s.querySelector('.act__corner')!.getBoundingClientRect().right + 6;
          const days = [...s.querySelectorAll('.act__day')].map((d) => d.getBoundingClientRect());
          const shown = days.filter((r) => r.right > start + 0.5 && r.left < view.right - 0.5);
          return {
            cut: shown.filter((r) => r.left < start - 0.5 || r.right > view.right + 0.5).length,
            past: shown.filter((r) => r.right > column.right + 0.5).length,
          };
        });
      await expect.poll(edges).toEqual({ cut: 0, past: 0 });
      await section(page).locator('[data-swipe-prev="activity"]').click();
      await page.waitForTimeout(600);
      await expect.poll(edges).toEqual({ cut: 0, past: 0 });
    });

    test('a tap shows the day’s tooltip; tapping it again hides it', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      });
      const page = await context.newPage();
      await page.goto(`${test.info().project.use.baseURL}/`);
      await section(page).scrollIntoViewIfNeeded();
      const tuesday = day(page, 'no contributions on 10 November');
      await tuesday.tap();
      await expect(tip(page)).toHaveText('no contributions on 10 November');
      await expect(tuesday).toHaveAttribute('data-state', 'tap');
      await expect(tuesday).toHaveCSS('outline-style', 'solid');
      await tuesday.tap();
      await expect(tip(page)).toBeHidden();
      await context.close();
    });

    test('the link moves under the section', async ({ page }) => {
      await page.goto('/');
      await expect(section(page).locator('.section__head a')).toBeHidden();
      await expect(
        section(page)
          .locator('.section__after')
          .getByRole('link', { name: /view on github/ }),
      ).toHaveAttribute('href', 'https://github.com/harrison-jennings');
    });
  });
});
