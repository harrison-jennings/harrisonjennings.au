import { expect, test } from '@playwright/test';

test.describe('the projects page', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('every live project: number, name, facts, description and links, in order', async ({
    page,
  }) => {
    await page.goto('/projects/');
    await expect(page.locator('h1')).toHaveText('projects');
    const first = page.locator('.pj').first();
    await expect(first.locator('.pj__n')).toHaveText('01');
    await expect(first.locator('h2')).toHaveText('leadlens');
    await expect(first.locator('.pj__facts')).toContainText('VS Code extension');
    await expect(first.locator('.pj__facts')).toContainText('2026');
    await expect(first.getByRole('link', { name: /leadlens\.harrisonjennings\.au/ })).toBeVisible();
  });

  test('the screenshot is a still frame, not a link', async ({ page }) => {
    await page.goto('/projects/');
    await expect(page.locator('.pj__shot').first()).toBeVisible();
    await expect(page.locator('.pj__shot a, a .pj__shot')).toHaveCount(0);
  });

  test('"archived" stays hidden until a project is archived', async ({ page }) => {
    await page.goto('/projects/');
    await expect(page.locator('#archived')).toHaveCount(0);
  });
});
