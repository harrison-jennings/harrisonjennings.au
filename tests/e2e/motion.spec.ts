import { expect, test, type Page } from '@playwright/test';
import { UNKNOWN_PATH, sitemapPaths } from './site';

test.use({ reducedMotion: 'reduce' });

const runningAnimations = (page: Page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === 'running')
      .map((a) => (a instanceof CSSAnimation ? a.animationName : a.constructor.name)),
  );

const logoState = (page: Page) =>
  page.$$eval('.mark__h', (paths) =>
    paths.map((p) => ({
      d: p.getAttribute('d'),
      dash: (p as SVGPathElement).style.strokeDasharray,
      dot: [p.nextElementSibling?.getAttribute('cx'), p.nextElementSibling?.getAttribute('cy')],
    })),
  );

for (const path of [...sitemapPaths(), UNKNOWN_PATH]) {
  test(`nothing animates on ${path} under reduced motion`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const atLoad = await logoState(page);
    expect(atLoad.length).toBeGreaterThan(0);
    for (const logo of atLoad) {
      expect(logo.dash).toBe('');
      expect(logo.dot).toEqual(['70', '88']);
    }

    // Hover everything that animates with full motion: the logo, then each button.
    await page.locator('[data-logo-draw]').first().hover();
    for (const button of await page.locator('[data-wipe]:visible').all()) await button.hover();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);

    expect(await runningAnimations(page)).toEqual([]);
    expect(await logoState(page)).toEqual(atLoad);
    const first = await page.screenshot();
    await page.waitForTimeout(500);
    expect((await page.screenshot()).equals(first), 'page changed while idle').toBe(true);
  });
}
