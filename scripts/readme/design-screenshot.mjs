// The README's design system screenshot: writes docs/images/design-system-dark.png and -light.png, the
// button page (its page head and preview frame) at desktop width. Shot from a local build: start
// `npm run design:preview` in one terminal, then run `npm run readme:design-screenshot` in another (or
// pass another address: `node scripts/readme/design-screenshot.mjs http://localhost:8791`).
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root = new URL('../../', import.meta.url);
const base = (process.argv[2] ?? 'http://localhost:8791').replace(/\/$/, '');

const browser = await chromium.launch();
for (const theme of ['dark', 'light']) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  await context.addInitScript((t) => localStorage.setItem('hj-theme', t), theme);
  const page = await context.newPage();
  const response = await page.goto(`${base}/components/button/`, { waitUntil: 'networkidle' });
  if (response?.status() !== 200)
    throw new Error(
      `the button page answered ${response?.status()}: is \`npm run design:preview\` running at ${base}?`,
    );
  await page.evaluate(() => document.fonts.ready);
  // The preview frame has sized itself once its specimen has reported its height.
  await page.waitForFunction(() =>
    /^\d+px$/.test(document.querySelector('.pf-view:not([hidden]) .pf-vp')?.style.height ?? ''),
  );
  await page.waitForTimeout(500);
  const png = await page.screenshot();
  await context.close();
  const file = new URL(`docs/images/design-system-${theme}.png`, root).pathname;
  await sharp(png).resize({ width: 1600 }).png({ compressionLevel: 9, palette: true }).toFile(file);
  console.log(`✓ ${file}`);
}
await browser.close();
