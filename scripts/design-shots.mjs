// The templates gallery's thumbnails (design-system/src/content/templates.yaml): the first screen of each
// page at 1440 and 390, in dark and light, written to design-system/public/templates/ as WebP. Shot from
// a local build, so no visit reaches analytics, with the cookie banner hidden and motion still (the
// hero's field drawn once, the logo drawn). Workers Builds has no browser, so this is run by hand and
// the images are committed: start `npm run preview` in one terminal, then run `npm run design:shots`
// in another (or pass another address: `node scripts/design-shots.mjs http://localhost:8787`).
import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { parse } from 'yaml';

const root = new URL('../', import.meta.url);
const base = (process.argv[2] ?? 'http://localhost:8787').replace(/\/$/, '');
const out = new URL('design-system/public/templates/', root);

const templates = parse(
  await readFile(new URL('design-system/src/content/templates.yaml', root), 'utf8'),
);

// The width each is shown at in the gallery, doubled for sharp screens.
const SIZES = {
  desktop: { viewport: { width: 1440, height: 900 }, width: 720 },
  phone: { viewport: { width: 390, height: 844 }, width: 168, mobile: true },
};

await mkdir(out, { recursive: true });
for (const file of await readdir(out)) if (file.endsWith('.webp')) await rm(new URL(file, out));

const browser = await chromium.launch();
for (const { id, path } of templates) {
  for (const theme of ['dark', 'light']) {
    for (const [device, size] of Object.entries(SIZES)) {
      const context = await browser.newContext({
        viewport: size.viewport,
        deviceScaleFactor: 1,
        isMobile: Boolean(size.mobile),
        hasTouch: Boolean(size.mobile),
        reducedMotion: 'reduce',
      });
      await context.addInitScript((t) => localStorage.setItem('hj-theme', t), theme);
      const page = await context.newPage();
      const response = await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
      const status = response?.status() ?? 0;
      if (status !== (id === '404' ? 404 : 200))
        throw new Error(`${path} answered ${status}: is \`npm run preview\` running at ${base}?`);
      await page.addStyleTag({ content: '[data-consent-banner] { display: none !important; }' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
      const png = await page.screenshot();
      await context.close();
      const name = `${id}-${theme}-${device}.webp`;
      await sharp(png)
        .resize({ width: size.width })
        .webp({ quality: 78 })
        .toFile(new URL(name, out).pathname);
      console.log(`✓ ${name}`);
    }
  }
}
await browser.close();
