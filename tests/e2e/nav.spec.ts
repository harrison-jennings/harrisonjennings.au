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

test('the nav compacts after 80px of scroll and opens back up on hover', async ({ page }) => {
  await page.goto('/');
  await page.mouse.move(720, 700);
  await page.evaluate(() => window.scrollTo(0, 79));
  await expect.poll(() => isCompact(page)).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 120));
  await expect.poll(() => isCompact(page)).toBe(true);
  await expect(page.locator('.nav__name')).toBeHidden();

  const box = await navBox(page);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => isCompact(page)).toBe(false);
  await page.mouse.move(720, 700);
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
