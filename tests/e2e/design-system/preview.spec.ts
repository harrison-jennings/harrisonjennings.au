import { expect, test, type Locator, type Page } from '@playwright/test';

// The preview frame (design-system/src/components/Preview.astro): the specimen at a true width, in the
// theme asked for, scaled to fit and never squashed; the code under it, copied exactly as shown.

const BUTTON = '/components/button/';

/** A view's iframe, the width its page lays out at, and its theme. */
async function inside(view: Locator) {
  const frame = view.locator('iframe').contentFrame();
  await expect(frame.locator('body')).toBeVisible();
  return {
    width: await frame.locator('body').evaluate(() => window.innerWidth),
    theme: await frame.locator('html').getAttribute('data-theme'),
  };
}

const views = (page: Page) => page.locator('.pf').first().locator('.pf-view:not([hidden])');

test('small examples start at their own size, in the page theme, with the site fonts', async ({
  page,
}) => {
  await page.goto(BUTTON);
  const pf = page.locator('.pf').first();
  await expect(pf.locator('[data-width="fit"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(views(page)).toHaveCount(1);
  const view = views(page).first();
  await expect(view.locator('.pf-size')).toContainText('own size as it renders');
  await expect(view.locator('.pf-size')).toContainText('100%');
  const { theme } = await inside(view);
  expect(theme).toBe('dark');
  const frame = view.locator('iframe').contentFrame();
  await expect
    .poll(() =>
      frame.locator('body').evaluate(() => document.fonts.check('16px "Schibsted Grotesk"')),
    )
    .toBe(true);
  await expect(frame.getByRole('link', { name: 'book a call' }).first()).toHaveClass(/btn/);
});

test('phone and desktop are true 390 and 1280 layouts, scaled to fit and saying so', async ({
  page,
}) => {
  await page.goto(BUTTON);
  const pf = page.locator('.pf').first();
  await pf.locator('[data-width="390"]').click();
  expect((await inside(views(page).first())).width).toBe(390);
  await expect(views(page).first().locator('.pf-size')).toContainText('phone 390 wide');
  await pf.locator('[data-width="1280"]').click();
  expect((await inside(views(page).first())).width).toBe(1280);
  await expect(views(page).first().locator('.pf-size')).toContainText(/shown at \d+%/);
  // Scaled, not squashed: the viewport is narrower than 1280, the layout isn't.
  const box = await views(page).first().locator('.pf-vp').boundingBox();
  expect(box?.width ?? 0).toBeLessThan(1280);
});

test('both themes sit side by side, and stack at desktop width', async ({ page }) => {
  await page.goto(BUTTON);
  const pf = page.locator('.pf').first();
  await pf.locator('[data-width="390"]').click();
  await pf.locator('[data-theme-choice="both"]').click();
  await expect(views(page)).toHaveCount(2);
  const [dark, light] = [views(page).nth(0), views(page).nth(1)];
  expect((await inside(dark)).theme).toBe('dark');
  expect((await inside(light)).theme).toBe('light');
  const [a, b] = [await dark.boundingBox(), await light.boundingBox()];
  expect(Math.round(a?.y ?? 0)).toBe(Math.round(b?.y ?? 1));
  await pf.locator('[data-width="1280"]').click();
  // Once the views have taken their new heights, light sits wholly under dark.
  await expect
    .poll(async () => {
      const [c, d] = [await dark.boundingBox(), await light.boundingBox()];
      return (d?.y ?? 0) - ((c?.y ?? 0) + (c?.height ?? 0));
    })
    .toBeGreaterThan(0);
});

test('the preview follows the page theme until a theme is picked in the frame', async ({
  page,
}) => {
  await page.goto(BUTTON);
  await page.locator('.ds-head [data-theme-toggle]').click();
  expect((await inside(views(page).first())).theme).toBe('light');
  const pf = page.locator('.pf').first();
  await pf.locator('[data-theme-choice="dark"]').click();
  await page.locator('.ds-head [data-theme-toggle]').click();
  await page.locator('.ds-head [data-theme-toggle]').click();
  expect((await inside(views(page).first())).theme).toBe('dark');
});

test('open shows the specimen on its own, in a new tab, in the theme shown', async ({ page }) => {
  await page.goto(BUTTON);
  const open = page.locator('.pf').first().locator('[data-open]');
  await expect(open).toHaveAttribute('target', '_blank');
  await expect(open).toHaveAttribute('href', '/specimens/button/?theme=dark');
  await expect(open).toHaveAccessibleName(/open the button example in a new tab/);
});

test('code: tabs from the keyboard, copied exactly, long code clipped until asked', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(BUTTON);
  const pf = page.locator('.pf').first();
  const copy = pf.locator('.pf-copy');
  await copy.click();
  const usage = await page.evaluate(() => navigator.clipboard.readText());
  expect(usage).toContain(`import Button from '../components/Button.astro';`);
  expect(usage).toContain('<Button label="save choices" size="s" />');

  const astro = pf.getByRole('tab', { name: 'astro' });
  await astro.focus();
  await page.keyboard.press('ArrowRight');
  const source = pf.getByRole('tab', { name: 'source' });
  await expect(source).toBeFocused();
  await expect(source).toHaveAttribute('aria-selected', 'true');
  await expect(pf.locator('[data-file-label]')).toHaveText('src/components/Button.astro');
  await copy.click();
  await expect(copy).toContainText('copied');
  const all = await page.evaluate(() => navigator.clipboard.readText());
  expect(all).toContain('interface Props');
  expect(all.split('\n').length).toBeGreaterThan(12); // every line, though clipped

  const more = pf.locator('.pf-panel:not([hidden]) [data-more]');
  await expect(more).toHaveText(/show all \d+ lines/);
  const pre = pf.locator('.pf-panel:not([hidden]) .pf-pre');
  expect((await pre.boundingBox())?.height ?? 0).toBeLessThanOrEqual(300);
  await more.click();
  await expect(more).toHaveText('show less');
  expect((await pre.boundingBox())?.height ?? 0).toBeGreaterThan(300);
  // Switching tabs collapses it again.
  await astro.click();
  await source.click();
  await expect(more).toHaveText(/show all \d+ lines/);
});

test('hiding the code puts copy in the toolbar', async ({ page }) => {
  await page.goto(BUTTON);
  const pf = page.locator('.pf').first();
  const toggle = pf.locator('[data-code-toggle]');
  await expect(pf.locator('[data-bar-copy]')).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toContainText('show code');
  await expect(pf.locator('.pf-code')).toBeHidden();
  await expect(pf.locator('[data-bar-copy]')).toBeVisible();
});

test('with reduced motion, specimens are still', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(BUTTON);
  const frame = views(page).first().locator('iframe');
  await expect(frame).toHaveAttribute('src', /still=1/);
  await expect(frame.contentFrame().locator('html')).toHaveAttribute('data-still', '');
  await context.close();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("both isn't offered, and desktop is shown scaled to fit the screen", async ({ page }) => {
    await page.goto(BUTTON);
    const pf = page.locator('.pf').first();
    await expect(pf.locator('[data-theme-choice="both"]')).toBeHidden();
    await pf.locator('[data-width="1280"]').click();
    expect((await inside(views(page).first())).width).toBe(1280);
    await expect(views(page).first().locator('.pf-size')).toContainText(/shown at 2\d%/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  });
});
