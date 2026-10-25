import { expect, test, type Page } from '@playwright/test';

// The end-to-end build includes drafts (INCLUDE_DRAFTS=true), so the draft formatting reference,
// which uses every element a post can contain, is there to test against.
const REF = '/blog/formatting-reference/';

const thirdParty = (page: Page) => {
  const own = new URL(test.info().project.use.baseURL ?? 'http://127.0.0.1').origin;
  const requests: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.protocol.startsWith('http') && url.origin !== own) requests.push(r.url());
  });
  return requests;
};

test.describe('the blog index', () => {
  test('lists posts by year under "blog." with the RSS link, and no booking band', async ({
    page,
  }) => {
    await page.goto('/blog/');
    await expect(page.locator('h1')).toHaveText('blog');
    await expect(page.getByRole('link', { name: 'rss feed' })).toHaveAttribute('href', '/rss/');
    const year = page.locator('.year').first();
    await expect(year.locator('.year__label')).toHaveText(/^\d{4}$/);
    await expect(page.getByRole('link', { name: 'formatting reference' })).toHaveAttribute(
      'href',
      REF,
    );
    await expect(page.locator('[data-book]')).toHaveCount(0);
  });
});

test.describe('a post', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the header: breadcrumb, title, dek, date and reading time', async ({ page }) => {
    await page.goto(REF);
    await expect(page.locator('.eyebrow a', { hasText: 'blog' })).toHaveAttribute('href', '/blog/');
    await expect(page.locator('h1')).toHaveText('formatting reference');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.posthead__dek')).toContainText('cheat sheet');
    await expect(page.locator('.posthead__meta > span')).toHaveText(
      /^\d{1,2} \w+ \d{4}, \d+ min read$/,
    );
  });

  test('"on this page" lists the sections and marks the one being read', async ({ page }) => {
    await page.goto(REF);
    const toc = page.locator('[data-toc]');
    await expect(toc).toBeVisible();
    await expect(toc.locator('a').first()).toHaveAttribute('aria-current', 'true');
    await expect(toc.locator('a[href="#code"]')).toBeVisible();
    await expect(toc.locator('.toc__sub a[href="#a-sub-section-heading"]')).toBeVisible();
    await page.locator('#tables').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -200));
    await page.evaluate(() => document.getElementById('tables')!.scrollIntoView());
    await expect(toc.locator('a[href="#tables"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('.toc-phone')).toBeHidden();
    await expect(page.locator('[data-book]')).toHaveCount(0);
  });

  test('prose: h5 shows as h4, callouts, figures, table and footnotes', async ({ page }) => {
    await page.goto(REF);
    const prose = page.locator('.prose');
    await expect(prose.locator('h5, h6')).toHaveCount(0);
    await expect(prose.locator('h4', { hasText: 'a fifth-level heading' })).toBeVisible();
    await expect(prose.locator('.callout__label')).toHaveText(['note', 'tip', 'heads up']);
    await expect(prose.locator('.figures__row--3 [data-zoomable]')).toHaveCount(3);
    await expect(prose.locator('.table td.num').first()).toHaveText('54%');
    await expect(prose.locator('.footnotes li')).toHaveCount(1);
  });

  test('code blocks: language and file name in the bar, highlighted lines, copy without prompts', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(REF);
    const blocks = page.locator('.codeblock');
    await expect(blocks.nth(1).locator('.codeblock__file')).toHaveText('src/scripts/booking.js');
    await expect(blocks.nth(1).locator('.codeblock__lang')).toHaveText('javascript');
    await expect(page.locator('.codeblock .line.highlighted')).toHaveCount(2);
    const shell = blocks.filter({ has: page.locator('.codeblock__lang', { hasText: 'shell' }) });
    const copy = shell.locator('[data-copy-code]');
    await copy.click();
    await expect(copy).toHaveText('copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'npm run build\nnpx wrangler dev',
    );
    await expect(copy).toHaveText('copy', { timeout: 3000 });
  });

  test('the image viewer: opens, zooms, steps, closes and returns focus', async ({ page }) => {
    await page.goto(REF);
    const images = page.locator('[data-zoomable]');
    const count = await images.count();
    const first = images.first();
    await first.click();
    const viewer = page.getByRole('dialog');
    await expect(viewer).toBeVisible();
    await expect(viewer).toHaveAccessibleName(/A sample diagram with six boxes/);
    await expect(viewer.getByRole('button', { name: 'Close' })).toBeFocused();
    await expect(viewer.locator('[data-count]')).toHaveText(`1 / ${count}`);
    await expect(viewer.locator('[data-cap]')).toHaveText(
      'A caption says what to look at, not what it is.',
    );

    await page.keyboard.press('+');
    await expect(viewer.locator('[data-level]')).toHaveText('150%');
    await page.keyboard.press('0');
    await expect(viewer.locator('[data-level]')).toHaveText('fit');
    await page.keyboard.press('ArrowRight');
    await expect(viewer.locator('[data-count]')).toHaveText(`2 / ${count}`);

    // Tab stays inside the viewer.
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      expect(await viewer.evaluate((v) => v.contains(document.activeElement))).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
    await expect(first).toBeFocused();
  });

  test('a click on the viewer image zooms and fits; a double-click zooms once; a drag is no click; the backdrop closes', async ({
    page,
  }) => {
    await page.goto(REF);
    await page.locator('[data-zoomable]').first().click();
    const viewer = page.getByRole('dialog');
    const image = viewer.locator('[data-img] img');
    const level = viewer.locator('[data-level]');
    await expect(image).toBeVisible();

    await image.click();
    await expect(level).toHaveText('200%');
    await image.click();
    await expect(level).toHaveText('fit');
    await image.dblclick();
    await expect(level).toHaveText('200%');

    const box = (await image.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await expect(level).toHaveText('200%');
    await expect(viewer).toBeVisible();

    await page.keyboard.press('0');
    const stage = (await viewer.locator('[data-stage]').boundingBox())!;
    await page.mouse.click(stage.x + 8, stage.y + 8);
    await expect(viewer).toBeHidden();
  });

  test('{nozoom} images stay out of the viewer', async ({ page }) => {
    await page.goto(REF);
    const plain = page.getByAltText("A sample diagram that doesn't zoom");
    await expect(plain).toBeVisible();
    expect(await plain.evaluate((img) => img.closest('[data-zoomable]'))).toBeNull();
  });

  test('a video loads from YouTube only when play is pressed', async ({ page }) => {
    await page.route('https://www.youtube-nocookie.com/**', (route) => route.abort());
    const requests = thirdParty(page);
    await page.goto(REF);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    expect(requests).toEqual([]);
    await page.getByRole('button', { name: 'Play video: A sample video', exact: true }).click();
    const frame = page.locator('.video iframe');
    await expect(frame).toHaveAttribute(
      'src',
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/,
    );
  });

  test('a video poster is served from this site, not YouTube', async ({ page }) => {
    await page.goto(REF);
    const poster = page.locator('.video__poster');
    await poster.scrollIntoViewIfNeeded();
    await expect(poster).toBeVisible();
    const src = await poster.evaluate((img: HTMLImageElement) => img.currentSrc || img.src);
    expect(new URL(src).origin).toBe(new URL(page.url()).origin);
    await expect(page.locator('.video-figure--poster figcaption')).toContainText(
      'Nothing loads from YouTube',
    );
  });
});

test('code blocks keep the dark treatment on a light page', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hj-theme', 'light'));
  await page.goto(REF);
  const css = (selector: string, property: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
  expect(await css('body', 'background-color')).toBe('rgb(244, 239, 235)'); // light ground
  expect(await css('.codeblock', 'background-color')).toBe('rgb(28, 26, 25)'); // dark surface
  expect(await css('.codeblock pre', 'color')).toBe('rgb(239, 234, 230)'); // dark text
  expect(await css('.codeblock', 'color-scheme')).toBe('dark');
  // Inline code follows the page.
  expect(await css('.prose p code', 'background-color')).toBe('rgb(251, 248, 245)');
});

test.describe('a post on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('"on this page" is a closed panel above the text; code runs edge to edge', async ({
    page,
  }) => {
    await page.goto(REF);
    const panel = page.locator('.toc-phone');
    await expect(panel).toBeVisible();
    await expect(panel).not.toHaveAttribute('open');
    await expect(page.locator('[data-toc]')).toBeHidden();
    await panel.locator('summary').click();
    await expect(panel.locator('a[href="#code"]')).toBeVisible();
    const block = (await page.locator('.codeblock').first().boundingBox())!;
    expect(Math.round(block.x)).toBe(0);
    expect(Math.round(block.width)).toBe(390);
  });
});
