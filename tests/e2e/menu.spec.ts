import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

const focusInMenu = (page: Page) =>
  page.evaluate(() => Boolean(document.activeElement?.closest('[data-menu]')));

// A native modal <dialog> lets Tab step out to the browser's own UI after the last control and back in
// from the first; what it must never do is reach the page behind it.
const focusWhere = (page: Page) =>
  page.evaluate(() => {
    if (!document.hasFocus()) return 'browser';
    return document.activeElement?.closest('[data-menu]') ? 'menu' : 'page';
  });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-menu-open]').click();
  await expect(page.locator('[data-menu]')).toBeVisible();
});

test('opened by a tap or click, focus is in the menu but no link shows a ring', async ({
  page,
}) => {
  expect(await page.$eval('[data-menu]', (d: HTMLDialogElement) => d.open)).toBe(true);
  expect(await focusInMenu(page)).toBe(true);
  await expect(page.locator('[data-menu]')).toBeFocused();
  expect(await page.locator('[data-menu] :focus-visible').count()).toBe(0);
  // The next Tab reaches the menu's controls.
  await page.keyboard.press('Tab');
  expect(await focusInMenu(page)).toBe(true);
});

test('opened from the keyboard, focus goes to the first link', async ({ page }) => {
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-menu-open]')).toBeFocused();
  await page.keyboard.press('Enter');
  const first = page.locator('[data-menu] .menu__links a').first();
  await expect(first).toBeFocused();
  // Shown with the brand's hover treatment (link colour), not a ring.
  await expect(first).toHaveCSS('outline-style', 'none');
  const link = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--link)';
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  });
  // After the colour's 150ms transition.
  await expect.poll(() => first.evaluate((a) => getComputedStyle(a).color)).toBe(link);
});

test('focus is trapped in the open menu', async ({ page }) => {
  const stops = await page.locator('[data-menu] a, [data-menu] button').count();
  for (const key of ['Tab', 'Shift+Tab']) {
    const visited = new Set<string>();
    for (let i = 0; i < stops * 2 + 2; i++) {
      await page.keyboard.press(key);
      const where = await focusWhere(page);
      expect(where, `${key} ${i + 1}`).not.toBe('page');
      if (where === 'menu')
        visited.add(await page.evaluate(() => document.activeElement!.outerHTML));
    }
    expect(visited.size, `${key} reaches every control in the menu`).toBe(stops);
  }
});

test('the page behind the open menu is inert', async ({ page }) => {
  await expect(page.locator('[data-menu-open]')).not.toBeFocused();
  await page.locator('[data-menu-open]').focus();
  expect(await focusInMenu(page)).toBe(true);
});

test('Escape closes the menu and returns focus to the menu button', async ({ page }) => {
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-menu]')).toBeHidden();
  await expect(page.locator('[data-menu-open]')).toBeFocused();
});

test('the close button closes the menu and returns focus', async ({ page }) => {
  await page.locator('[data-menu-close]').click();
  await expect(page.locator('[data-menu]')).toBeHidden();
  await expect(page.locator('[data-menu-open]')).toBeFocused();
});
