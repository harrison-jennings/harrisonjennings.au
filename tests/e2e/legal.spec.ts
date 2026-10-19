import { expect, test } from '@playwright/test';

test.describe('the legal pages', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('privacy: date, a link to the terms, the short version and the contact line', async ({
    page,
  }) => {
    await page.goto('/privacy-policy/');
    await expect(page.locator('h1')).toHaveText('privacy policy');
    await expect(page.locator('.legal-meta')).toContainText(/^Last updated \d{1,2} \w+ \d{4}/);
    await expect(page.locator('.legal-meta a')).toHaveAttribute('href', '/terms-of-use/');
    await expect(page.locator('.short li').first()).toBeVisible();
    await expect(page.locator('.legal-contact a')).toHaveAttribute(
      'href',
      'mailto:privacy@harrisonjennings.au',
    );
  });

  test('privacy: the cookie tables come from the same list as the cookie preferences', async ({
    page,
  }) => {
    await page.goto('/privacy-policy/');
    const tables = page.locator('.prose table.cookie-table');
    await expect(tables).toHaveCount(2);
    await expect(tables.first()).toContainText('cc_cookie');
    await expect(tables.nth(1)).toContainText('_ga');
    await expect(page.locator('.prose .cookie-none')).toHaveText(
      'Nothing in this category sets a cookie at the moment.',
    );
    // The dialog lists the same cookies.
    await page.getByRole('contentinfo').getByRole('button', { name: 'cookie settings' }).click();
    await expect(page.locator('[data-consent-dialog] .cookies').first()).toContainText(
      'cf_clearance',
    );
  });

  test('privacy: the cookies section opens the cookie preferences', async ({ page }) => {
    await page.goto('/privacy-policy/');
    await page.locator('.prose').getByRole('button', { name: 'cookie settings' }).click();
    await expect(page.getByRole('dialog', { name: 'cookie preferences' })).toBeVisible();
  });

  test('"on this page" lists the h2s only, beside the text', async ({ page }) => {
    await page.goto('/privacy-policy/');
    const toc = page.locator('[data-toc]');
    await expect(toc).toBeVisible();
    await expect(toc.locator('a[href="#cookies-and-similar-technologies"]')).toBeVisible();
    await expect(toc.locator('a[href="#analytics"]')).toHaveCount(0);
  });

  test('terms: "Effective", a link to the privacy policy and no short version', async ({
    page,
  }) => {
    await page.goto('/terms-of-use/');
    await expect(page.locator('h1')).toHaveText('terms of use');
    await expect(page.locator('.legal-meta')).toContainText(/^Effective \d{1,2} \w+ \d{4}/);
    await expect(page.locator('.legal-meta a')).toHaveAttribute('href', '/privacy-policy/');
    await expect(page.locator('.short')).toHaveCount(0);
    await expect(page.locator('.legal-contact a')).toHaveAttribute(
      'href',
      'mailto:contact@harrisonjennings.au',
    );
  });
});
