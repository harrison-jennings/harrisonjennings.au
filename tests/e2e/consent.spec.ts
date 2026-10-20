import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { useTheme } from './site';

// A first visit: no cookie choice yet (the other specs start with one already made).
test.use({ storageState: { cookies: [], origins: [] } });

const banner = (page: Page) => page.getByRole('region', { name: 'cookies' });
const dialog = (page: Page) => page.getByRole('dialog', { name: 'cookie preferences' });

/** The Consent Mode commands pushed so far: ['default' | 'update', analytics, ads]. */
const consentCommands = (page: Page) =>
  page.evaluate(() =>
    (window.dataLayer ?? [])
      .filter(
        (entry): entry is IArguments =>
          Object.prototype.toString.call(entry) === '[object Arguments]',
      )
      .map((args) => [...args])
      .filter((args) => args[0] === 'consent')
      .map((args) => [args[1], args[2].analytics_storage, args[2].ad_storage]),
  );

const savedChoice = async (page: Page) => {
  const cookie = (await page.context().cookies()).find((c) => c.name === 'cc_cookie');
  return cookie ? JSON.parse(decodeURIComponent(cookie.value)) : undefined;
};

test('a first visit shows the banner, with everything optional denied', async ({ page }) => {
  await page.goto('/');
  await expect(banner(page)).toBeVisible();
  for (const name of ['accept all', 'reject non-essential', 'manage preferences'])
    await expect(banner(page).getByRole('button', { name })).toBeVisible();
  // No close button, and the page behind stays usable.
  await expect(banner(page).getByRole('button', { name: /close/ })).toHaveCount(0);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  // No dialog of any kind for assistive technology: CookieConsent builds an empty one of its own,
  // which must stay hidden (the banner is ours, and it's a region, not a dialog).
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await consentCommands(page)).toEqual([['default', 'denied', 'denied']]);
});

test('the banner stays on every page until a choice is made', async ({ page }) => {
  await page.goto('/');
  await page.mouse.wheel(0, 1500);
  await page.goto('/blog/');
  await expect(banner(page)).toBeVisible();
  expect(await savedChoice(page)).toBeUndefined();
});

test('"accept all" grants analytics and advertising, logs it, and is remembered', async ({
  page,
}) => {
  await page.goto('/');
  const logged = page.waitForRequest('**/api/consent');
  const response = page.waitForResponse('**/api/consent');
  await banner(page).getByRole('button', { name: 'accept all' }).click();
  await expect(banner(page)).toBeHidden();
  expect(await consentCommands(page)).toContainEqual(['update', 'granted', 'granted']);
  const body = (await logged).postDataJSON();
  expect(body).toMatchObject({
    categories: ['necessary', 'analytics', 'advertising'],
    action: 'accept_all',
    revision: 1,
    path: '/',
  });
  expect((await response).status()).toBe(204);
  expect((await savedChoice(page))?.categories).toEqual(['necessary', 'analytics', 'advertising']);
  expect(
    await page.evaluate(() =>
      (window.dataLayer as Array<Record<string, unknown>>).some(
        (e) => e['event'] === 'cookieConsentInteraction' && e['consent_action'] === 'accept_all',
      ),
    ),
  ).toBe(true);

  // The new consent is in force before Tag Manager sees the interaction event.
  const order = await page.evaluate(() =>
    (window.dataLayer ?? []).flatMap((entry) => {
      if (Object.prototype.toString.call(entry) === '[object Arguments]') {
        const args = [...(entry as IArguments)];
        return args[0] === 'consent' && args[1] === 'update' ? ['update'] : [];
      }
      return (entry as Record<string, unknown>)['event'] === 'cookieConsentInteraction'
        ? ['event']
        : [];
    }),
  );
  // One update, not two.
  expect(order).toEqual(['update', 'event']);

  // Next page: no banner, and the saved choice applies in the head, before Tag Manager would load,
  // with no second update after it.
  await page.goto('/blog/');
  await expect(banner(page)).toBeHidden();
  await page.waitForLoadState('load');
  expect(await consentCommands(page)).toEqual([
    ['default', 'denied', 'denied'],
    ['update', 'granted', 'granted'],
  ]);
});

test('the banner overlays the page without adding room at the bottom, and focus stops above it', async ({
  page,
}) => {
  await page.goto('/');
  await expect(banner(page)).toBeVisible();
  const styles = () =>
    page.evaluate(() => ({
      padding: parseFloat(getComputedStyle(document.body).paddingBottom),
      scrollPadding: parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom),
    }));
  await expect.poll(async () => (await styles()).scrollPadding).toBeGreaterThan(100);
  expect((await styles()).padding).toBe(0);
  await banner(page).getByRole('button', { name: 'reject non-essential' }).click();
  await expect.poll(async () => (await styles()).scrollPadding).toBe(0);
});

test('"reject non-essential" keeps everything optional denied', async ({ page }) => {
  await page.goto('/');
  const logged = page.waitForRequest('**/api/consent');
  await banner(page).getByRole('button', { name: 'reject non-essential' }).click();
  await expect(banner(page)).toBeHidden();
  expect((await logged).postDataJSON()).toMatchObject({
    categories: ['necessary'],
    action: 'reject_all',
  });
  expect(await consentCommands(page)).toContainEqual(['update', 'denied', 'denied']);
  expect((await savedChoice(page))?.categories).toEqual(['necessary']);
});

test.describe('the preferences dialog', () => {
  test('opens with focus on its close button, switches off, and Esc goes back to the banner', async ({
    page,
  }) => {
    await page.goto('/');
    const manage = banner(page).getByRole('button', { name: 'manage preferences' });
    await manage.click();
    await expect(dialog(page)).toBeVisible();
    await expect(banner(page)).toBeHidden();
    await expect(
      dialog(page).getByRole('button', { name: 'close cookie preferences' }),
    ).toBeFocused();
    for (const name of ['analytics', 'advertising'])
      await expect(dialog(page).getByRole('switch', { name })).toHaveAttribute(
        'aria-checked',
        'false',
      );
    await expect(dialog(page).getByText('always on')).toBeVisible();
    // Analytics is open; essential and advertising are closed.
    await expect(
      dialog(page).getByRole('button', { name: 'analytics', exact: true }),
    ).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(banner(page)).toBeVisible();
    await expect(manage).toBeFocused();
    expect(await savedChoice(page)).toBeUndefined();
  });

  test('keeps focus inside while open', async ({ page }) => {
    await page.goto('/');
    await banner(page).getByRole('button', { name: 'manage preferences' }).click();
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        if (!document.hasFocus()) return true; // the browser's own controls
        return Boolean(document.activeElement?.closest('[data-consent-dialog]'));
      });
      expect(inside, `Tab ${i + 1}`).toBe(true);
    }
  });

  test('saves just the switched-on categories', async ({ page }) => {
    await page.goto('/');
    await banner(page).getByRole('button', { name: 'manage preferences' }).click();
    await dialog(page).getByRole('switch', { name: 'analytics' }).click();
    await expect(dialog(page).getByRole('switch', { name: 'analytics' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    const logged = page.waitForRequest('**/api/consent');
    await dialog(page).getByRole('button', { name: 'save choices' }).click();
    await expect(dialog(page)).toBeHidden();
    expect((await logged).postDataJSON()).toMatchObject({
      categories: ['necessary', 'analytics'],
      action: 'custom',
    });
    expect(await consentCommands(page)).toContainEqual(['update', 'granted', 'denied']);
  });

  test('"cookie settings" in the footer reopens it with the saved choice, and a change is logged', async ({
    page,
  }) => {
    await page.goto('/');
    await banner(page).getByRole('button', { name: 'accept all' }).click();
    await page.getByRole('contentinfo').getByRole('button', { name: 'cookie settings' }).click();
    await expect(dialog(page).getByRole('switch', { name: 'advertising' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await dialog(page).getByRole('switch', { name: 'advertising' }).click();
    const logged = page.waitForRequest('**/api/consent');
    await dialog(page).getByRole('button', { name: 'save choices' }).click();
    expect((await logged).postDataJSON()).toMatchObject({
      categories: ['necessary', 'analytics'],
      action: 'custom',
    });
    // The change is one update, after the one from the first choice.
    expect((await consentCommands(page)).filter(([command]) => command === 'update')).toEqual([
      ['update', 'granted', 'granted'],
      ['update', 'granted', 'denied'],
    ]);
    await expect(
      page.getByRole('contentinfo').getByRole('button', { name: 'cookie settings' }),
    ).toBeFocused();
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the dialog fills the screen and leads with "save choices"', async ({ page }) => {
    await page.goto('/');
    await banner(page).getByRole('button', { name: 'manage preferences' }).click();
    const box = (await dialog(page).boundingBox())!;
    expect(Math.round(box.width)).toBe(390);
    expect(Math.round(box.height)).toBe(844);
    const save = (await dialog(page).getByRole('button', { name: 'save choices' }).boundingBox())!;
    const accept = (await dialog(page).getByRole('button', { name: 'accept all' }).boundingBox())!;
    expect(save.y).toBeLessThan(accept.y);
  });
});

test('nothing is sent to Google or anywhere else before a choice', async ({ page }) => {
  const own = new URL(test.info().project.use.baseURL ?? 'http://127.0.0.1').origin;
  const outside: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.protocol.startsWith('http') && url.origin !== own) outside.push(r.url());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(outside).toEqual([]);
});

for (const theme of ['dark', 'light'] as const) {
  test(`the banner and the dialog have no axe violations in ${theme}`, async ({ page }) => {
    await useTheme(page, theme);
    await page.goto('/');
    await expect(banner(page)).toBeVisible();
    const scan = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .include('[data-consent-banner], [data-consent-dialog]')
        .analyze();
    expect((await scan()).violations.map((v) => v.id)).toEqual([]);
    await banner(page).getByRole('button', { name: 'manage preferences' }).click();
    await dialog(page).getByRole('button', { name: 'advertising', exact: true }).click();
    expect((await scan()).violations.map((v) => v.id)).toEqual([]);
  });
}
