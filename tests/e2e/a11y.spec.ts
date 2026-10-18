import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { UNKNOWN_PATH, sitemapPaths } from './site';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const colorScheme of ['dark', 'light'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    for (const path of [...sitemapPaths(), UNKNOWN_PATH]) {
      test(`${path} has no axe violations`, async ({ page }) => {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
        const summary = violations.map(
          (v) =>
            `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`,
        );
        expect(summary, summary.join('\n')).toEqual([]);
      });
    }
  });
}
