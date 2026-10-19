import { expect, test, type Page } from '@playwright/test';
import { UNKNOWN_PATH } from './site';

test.use({ viewport: { width: 1440, height: 900 } });

const navBox = async (page: Page) => (await page.locator('[data-nav]').boundingBox())!;
const isCompact = (page: Page) =>
  page.locator('[data-nav]').evaluate((n) => n.classList.contains('is-compact'));

test('on an inner page the nav sits 16px from the top and stays there while scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 500 });
  await page.goto(UNKNOWN_PATH);
  expect((await navBox(page)).y).toBe(16);
  const mainTop = await page.locator('main').evaluate((m) => m.getBoundingClientRect().top);
  expect(mainTop).toBeGreaterThanOrEqual(16 + (await navBox(page)).height);

  await page.mouse.move(720, 450);
  await page.evaluate(() => window.scrollTo(0, 200));
  await expect.poll(() => isCompact(page)).toBe(true);
  expect((await navBox(page)).y).toBe(16);
  // Compacting doesn't move the page under it.
  expect(await page.locator('main').evaluate((m) => m.getBoundingClientRect().top)).toBe(
    mainTop - 200,
  );
});

test('on the home page the nav floats over the top of the page', async ({ page }) => {
  await page.goto('/');
  expect((await navBox(page)).y).toBe(16);
  expect(await page.locator('main').evaluate((m) => m.getBoundingClientRect().top)).toBe(0);
});

test('the nav compacts after 80px of scroll and stays compact under the pointer', async ({
  page,
}) => {
  await page.goto('/');
  await page.mouse.move(720, 700);
  await page.evaluate(() => window.scrollTo(0, 79));
  await expect.poll(() => isCompact(page)).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 120));
  await expect.poll(() => isCompact(page)).toBe(true);
  await expect(page.locator('.nav__name')).toBeHidden();

  // Hovering mustn't move the links out from under the pointer.
  await page.waitForTimeout(400); // let the compacting transition finish
  const blog = page.locator('.nav__links a', { hasText: 'blog' });
  const before = (await blog.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.waitForTimeout(300);
  expect(await isCompact(page)).toBe(true);
  expect((await blog.boundingBox())!.x).toBe(before.x);
});

test('keyboard focus opens the compact nav, so its icons stay reachable', async ({ page }) => {
  await page.goto('/');
  await page.mouse.move(720, 700);
  await page.evaluate(() => window.scrollTo(0, 120));
  await expect.poll(() => isCompact(page)).toBe(true);
  await page.locator('.nav__brand').focus();
  await page.keyboard.press('Tab');
  await expect.poll(() => isCompact(page)).toBe(false);
  await expect(page.locator('.nav__icons')).toBeVisible();
  await page.locator('main').focus();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect.poll(() => isCompact(page)).toBe(true);
});

test('the current page carries the underline', async ({ page }) => {
  await page.goto('/');
  const home = page.locator('.nav__links a', { hasText: 'home' });
  await expect(home).toHaveAttribute('aria-current', 'page');
  await expect
    .poll(() => home.evaluate((a) => getComputedStyle(a, '::after').transform))
    .toBe('matrix(1, 0, 0, 1, 0, 0)');
});

test('the footer logo draws when the footer comes into view, not on load', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 500 });
  await page.goto(UNKNOWN_PATH);
  const footerMark = page.locator('footer .mark__h');
  await page.waitForTimeout(300);
  expect(await footerMark.evaluate((p: SVGPathElement) => p.style.strokeDasharray)).toBe('');
  await page.locator('footer').scrollIntoViewIfNeeded();
  await expect
    .poll(() => footerMark.evaluate((p: SVGPathElement) => p.style.strokeDasharray))
    .not.toBe('');
});

for (const width of [390, 1440]) {
  test(`at ${width}px the floating nav clears the home page heading`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const nav = await navBox(page);
    const heading = (await page.locator('main h1').boundingBox())!;
    expect(heading.y).toBeGreaterThanOrEqual(nav.y + nav.height);
  });
}

test('in the compact nav the button sits evenly in the pill end', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto('/');
  await page.mouse.move(720, 550);
  await page.evaluate(() => window.scrollTo(0, 300));
  await expect.poll(() => isCompact(page)).toBe(true);
  await page.waitForTimeout(300); // let the padding transition finish
  const nav = await navBox(page);
  const cta = (await page.locator('[data-nav] .nav__cta').boundingBox())!;
  const top = cta.y - nav.y;
  const bottom = nav.y + nav.height - (cta.y + cta.height);
  const right = nav.x + nav.width - (cta.x + cta.width);
  expect(Math.abs(top - bottom)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(right - top)).toBeLessThanOrEqual(0.5);
});
