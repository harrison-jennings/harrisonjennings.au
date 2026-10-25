import AxeBuilder from '@axe-core/playwright';
import { devices, expect, test } from '@playwright/test';
import { designPages } from './site';

// The design system's shell (design-system/src/layouts/Shell.astro): on every page, at both widths and
// in both themes, nothing scrolls sideways and axe finds nothing; the sidebar, the phone menu and
// "on this page" work, from the keyboard too.

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const WIDTHS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];

for (const { name, width, height } of WIDTHS) {
  test.describe(`at ${name} width`, () => {
    test.use({ viewport: { width, height } });

    for (const path of designPages()) {
      for (const theme of ['dark', 'light'] as const) {
        test(`${path} has no axe violations in ${theme}`, async ({ page }) => {
          await page.addInitScript((t) => localStorage.setItem('hj-theme', t), theme);
          await page.goto(path);
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          await page.evaluate(() => document.fonts.ready);
          const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
          const summary = violations.map(
            (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
          );
          expect(summary, summary.join('\n')).toEqual([]);
        });
      }
    }
  });
}

// Every width the shell changes at (1200 and 1024, and the site's 760), either side, and the ends.
for (const width of [390, 761, 800, 1023, 1024, 1180, 1199, 1440]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const path of designPages()) {
      test(`${path} doesn't scroll sideways`, async ({ page }) => {
        await page.goto(path);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          width,
        );
      });
    }
  });
}

// Chrome's phone emulation widens the page to fit anything too wide, which a plain narrow window
// doesn't show (it's how the site's home page once overflowed unseen).
// The phone's size, scale and touch, in Chromium (the profile's own browser is WebKit).
const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } = devices['iPhone 12 Pro'];
const iphone = { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent };

test.describe('in Chrome on an iPhone', () => {
  test.use(iphone);
  for (const path of designPages()) {
    test(`${path} fits the screen`, async ({ page }) => {
      await page.goto(path);
      expect(await page.evaluate(() => window.innerWidth)).toBe(390);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    });
  }
});

test.describe('between phone and full desktop', () => {
  for (const [width, side, toc, picker] of [
    [1440, true, true, false],
    [1100, true, false, false],
    [900, false, false, true],
  ] as const) {
    test(`at ${width}px: sidebar ${side}, on this page ${toc}, page picker ${picker}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/components/button/');
      await expect(page.locator('.ds-side')).toBeVisible({ visible: side });
      await expect(page.locator('.ds-toc')).toBeVisible({ visible: toc });
      await expect(page.locator('.ds-where')).toBeVisible({ visible: picker });
      await expect(page.locator('.ds-sections')).toBeVisible({ visible: !picker });
    });
  }
});

test('every page says it is the design system: the brick line and "design system" by the logo', async ({
  page,
}) => {
  for (const path of designPages()) {
    await page.goto(path);
    const head = page.locator('.ds-head');
    await expect(head).toHaveCSS('border-top-width', '2px');
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    );
    const brick = await head.evaluate((h) => getComputedStyle(h).borderTopColor);
    expect(brick).toBe(
      await page.evaluate((c) => {
        const probe = document.createElement('i');
        probe.style.color = c;
        document.body.append(probe);
        const rgb = getComputedStyle(probe).color;
        probe.remove();
        return rgb;
      }, accent),
    );
    await expect(head.locator('.ds-lockup__ds')).toHaveText('design system');
  }
});

test('the header marks the current section; the sidebar the current page, in its open group', async ({
  page,
}) => {
  await page.goto('/components/button/');
  await expect(page.locator('.ds-sections a[aria-current]')).toHaveText('components');
  const side = page.locator('.ds-side');
  const current = side.locator('a[aria-current="page"]');
  await expect(current).toHaveText('button');
  await expect(current).toBeVisible();
  await expect(side.locator('[data-group-toggle]').first()).toHaveAttribute(
    'aria-expanded',
    'true',
  );
});

test('a sidebar group opens and closes from the keyboard', async ({ page }) => {
  await page.goto('/components/button/');
  const toggle = page.locator('.ds-side [data-group-toggle]').first();
  const pages = page.locator(`#${await toggle.getAttribute('aria-controls')}`);
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(pages).toBeHidden();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(pages).toBeVisible();
});

test('without JavaScript, every group shows', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/components/button/');
  for (const list of await page.locator('.ds-side .ds-group__pages').all())
    await expect(list).toBeVisible();
  await context.close();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the page picker opens the menu from the keyboard; Esc closes it and focus goes back', async ({
    page,
  }) => {
    await page.goto('/components/button/');
    const picker = page.locator('.ds-where button');
    await expect(picker).toContainText('components /');
    await expect(picker).toContainText('button');
    await picker.focus();
    await page.keyboard.press('Enter');
    const menu = page.locator('[data-menu]');
    await expect(menu).toBeVisible();
    // Opened from the keyboard, focus goes to the current section, which starts open.
    const section = menu.locator('[data-section-toggle][aria-current]');
    await expect(section).toBeFocused();
    await expect(section).toHaveAttribute('aria-expanded', 'true');
    await expect(menu.locator('a[aria-current="page"]')).toHaveText('button');
    // Focus never reaches the page behind. (A native modal dialog lets Tab step out to the browser's own
    // UI after the last control and back in, as the site's menu does.)
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const where = await page.evaluate(() =>
        !document.hasFocus()
          ? 'browser'
          : document.activeElement?.closest('[data-menu]')
            ? 'menu'
            : document.activeElement === document.body
              ? 'browser'
              : 'page',
      );
      expect(where, `Tab ${i + 1}`).not.toBe('page');
    }
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(picker).toBeFocused();
  });

  test('the menu button opens the same menu, and its close button closes it', async ({ page }) => {
    await page.goto('/components/button/');
    await page.getByRole('button', { name: 'Menu' }).click();
    const menu = page.locator('[data-menu]');
    await expect(menu).toBeVisible();
    await menu.getByRole('button', { name: 'Close menu' }).click();
    await expect(menu).toBeHidden();
  });

  test('a group opened in the menu stays open for the rest of the visit', async ({ page }) => {
    await page.goto('/components/button/');
    const menu = page.locator('[data-menu]');
    const openMenu = async () => {
      await page.getByRole('button', { name: 'Menu' }).click();
      const content = menu.locator('[data-section-toggle]', { hasText: 'content' });
      if ((await content.getAttribute('aria-expanded')) !== 'true') await content.click();
    };
    await openMenu();
    const group = menu.locator('#menu-content [data-group-toggle]').first();
    await expect(group).toHaveAttribute('aria-expanded', 'false');
    await group.click();
    await expect(group).toHaveAttribute('aria-expanded', 'true');
    await page.reload();
    await openMenu();
    await expect(menu.locator('#menu-content [data-group-toggle]').first()).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});

test('"on this page" lists the page\'s sections and marks the one being read', async ({ page }) => {
  await page.goto('/components/button/');
  const toc = page.locator('.ds-toc');
  const first = toc.locator('a').first();
  await expect(first).toHaveText('preview');
  await expect(first).toHaveAttribute('aria-current', 'true');
});

test('a section address goes to its first page', async ({ page }) => {
  await page.goto('/components/');
  await expect(page).toHaveURL(/\/components\/button\/$/);
});

test('the breadcrumb leads back to the section and the group', async ({ page }) => {
  await page.goto('/content/callouts/');
  const crumb = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(crumb.getByRole('link', { name: 'content' })).toHaveAttribute(
    'href',
    '/content/callouts/',
  );
  await expect(crumb.getByRole('link', { name: 'text' })).toHaveAttribute(
    'href',
    '/content/callouts/',
  );
});

test('the theme toggle switches theme and the choice carries to the next page', async ({
  page,
}) => {
  await page.goto('/components/button/');
  await page.locator('.ds-head [data-theme-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/content/callouts/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
