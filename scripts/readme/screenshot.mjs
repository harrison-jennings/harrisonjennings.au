// The README's screenshot: writes docs/images/screenshot.png, the home page on a laptop and a phone in
// simple drawn frames, on the site's dark ground. Shots come from a local build, so no visit reaches
// analytics: start `npm run preview` in one terminal, then run `npm run readme:screenshot` in another
// (or pass another address: `node scripts/readme/screenshot.mjs http://localhost:8787`).
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root = new URL('../../', import.meta.url);
const base = process.argv[2] ?? 'http://localhost:8787';

const tokens = JSON.parse(readFileSync(new URL('design/tokens.json', root), 'utf8'));
const c = Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t.value.dark]));

/** The home page in dark mode, with the cookie banner hidden and the intro animations finished. */
async function shoot(browser, { width, height, scale, mobile = false }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    isMobile: mobile,
    hasTouch: mobile,
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '[data-consent-banner] { display: none !important; }' });
  await page.waitForTimeout(3500);
  const png = await page.screenshot();
  await context.close();
  return `data:image/png;base64,${png.toString('base64')}`;
}

const browser = await chromium.launch();
// A 14-inch MacBook Pro at its default 1512 x 982 points, full screen (the notch takes a band at the
// top), and an iPhone 16 Pro's 393 x 852 points below its 54-point status bar.
const desktop = await shoot(browser, { width: 1512, height: 945, scale: 2 });
const phonePage = await shoot(browser, { width: 393, height: 798, scale: 3, mobile: true });
await browser.close();

// The frames are neutral metal and glass, not brand colours.
const METAL_HI = '#6a6a6f';
const METAL = '#3a3a3d';
const METAL_LO = '#1f1f21';
const GLASS = '#050505';

const W = 2400;
const H = 1500;

const lid = { x: 150, y: 120, w: 1720, r: 34, bezel: 22 };
const screen = { x: lid.x + lid.bezel, y: lid.y + lid.bezel, w: lid.w - 2 * lid.bezel };
screen.h = Math.round((screen.w * 982) / 1512);
lid.h = screen.h + 2 * lid.bezel + 8;
const band = screen.h - Math.round((screen.w * 945) / 1512);
const deck = { w: 1940, h: 30 };
deck.x = lid.x + lid.w / 2 - deck.w / 2;
deck.y = lid.y + lid.h;

const phone = { x: 1800, y: 430, w: 474, bezel: 15, r: 78 };
const ps = { x: phone.x + phone.bezel, y: phone.y + phone.bezel, w: phone.w - 2 * phone.bezel };
ps.h = Math.round((ps.w * 852) / 393);
ps.r = phone.r - phone.bezel;
phone.h = ps.h + 2 * phone.bezel;
const pt = ps.w / 393; // one point on the phone
const statusHeight = 54 * pt;

function statusBar() {
  const y = ps.y + 33 * pt;
  const right = ps.x + ps.w - 30 * pt;
  const bars = [0, 1, 2, 3]
    .map((i) => {
      const h = (4 + i * 2.6) * pt;
      return `<rect x="${right - 66 * pt + i * 5 * pt}" y="${y - h}" width="${3.2 * pt}" height="${h}" rx="${0.8 * pt}"/>`;
    })
    .join('');
  const wifi = `<path d="M${right - 39 * pt} ${y - 8.5 * pt} a${10 * pt} ${10 * pt} 0 0 1 ${14 * pt} 0 l${-2 * pt} ${2 * pt} a${7 * pt} ${7 * pt} 0 0 0 ${-10 * pt} 0 z M${right - 34.5 * pt} ${y - 4 * pt} a${3 * pt} ${3 * pt} 0 0 1 ${5 * pt} 0 l${-2.5 * pt} ${2.5 * pt} z"/>`;
  const battery =
    `<rect x="${right - 22 * pt}" y="${y - 11 * pt}" width="${22 * pt}" height="${11 * pt}" rx="${3 * pt}" fill="none" stroke="${c.text}" stroke-opacity="0.45" stroke-width="${pt}"/>` +
    `<rect x="${right - 20.5 * pt}" y="${y - 9.5 * pt}" width="${16 * pt}" height="${8 * pt}" rx="${1.8 * pt}"/>`;
  return `<text x="${ps.x + 34 * pt}" y="${y}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="600" font-size="${17 * pt}" fill="${c.text}">9:41</text><g fill="${c.text}">${bars}${wifi}${battery}</g>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="brick" cx="0.78" cy="0.12" r="0.55"><stop offset="0" stop-color="${c.accent}" stop-opacity="0.42"/><stop offset="1" stop-color="${c.accent}" stop-opacity="0"/></radialGradient>
    <radialGradient id="apricot" cx="0.98" cy="0.98" r="0.45"><stop offset="0" stop-color="${c.apricot}" stop-opacity="0.32"/><stop offset="1" stop-color="${c.apricot}" stop-opacity="0"/></radialGradient>
    <linearGradient id="lidRim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${METAL_HI}"/><stop offset="1" stop-color="${METAL}"/></linearGradient>
    <linearGradient id="deck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${METAL_HI}"/><stop offset="0.35" stop-color="${METAL}"/><stop offset="1" stop-color="${METAL_LO}"/></linearGradient>
    <linearGradient id="phoneRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${METAL_HI}"/><stop offset="0.5" stop-color="${METAL}"/><stop offset="1" stop-color="${METAL_HI}"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="28"/><feOffset dy="26"/><feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <clipPath id="screen"><rect x="${screen.x}" y="${screen.y}" width="${screen.w}" height="${screen.h}" rx="10"/></clipPath>
    <clipPath id="phoneScreen"><rect x="${ps.x}" y="${ps.y}" width="${ps.w}" height="${ps.h}" rx="${ps.r}"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" rx="40" fill="${c.ground}"/>
  <rect width="${W}" height="${H}" rx="40" fill="url(#brick)"/>
  <rect width="${W}" height="${H}" rx="40" fill="url(#apricot)"/>

  <g filter="url(#shadow)">
    <rect x="${lid.x - 3}" y="${lid.y - 3}" width="${lid.w + 6}" height="${lid.h + 3}" rx="${lid.r + 3}" fill="url(#lidRim)"/>
    <rect x="${lid.x}" y="${lid.y}" width="${lid.w}" height="${lid.h}" rx="${lid.r}" fill="${GLASS}"/>
    <path d="M${deck.x} ${deck.y} H${deck.x + deck.w} V${deck.y + deck.h - 14} Q${deck.x + deck.w} ${deck.y + deck.h} ${deck.x + deck.w - 60} ${deck.y + deck.h} H${deck.x + 60} Q${deck.x} ${deck.y + deck.h} ${deck.x} ${deck.y + deck.h - 14} Z" fill="url(#deck)"/>
    <rect x="${deck.x + deck.w / 2 - 150}" y="${deck.y}" width="300" height="11" rx="5.5" fill="${METAL_LO}"/>
  </g>
  <g clip-path="url(#screen)">
    <rect x="${screen.x}" y="${screen.y}" width="${screen.w}" height="${screen.h}" fill="${GLASS}"/>
    <image x="${screen.x}" y="${screen.y + band}" width="${screen.w}" height="${screen.h - band}" xlink:href="${desktop}" preserveAspectRatio="xMidYMid slice"/>
  </g>
  <rect x="${screen.x + screen.w / 2 - 95}" y="${screen.y - 1}" width="190" height="${band - 6}" rx="12" fill="${GLASS}"/>
  <circle cx="${screen.x + screen.w / 2}" cy="${screen.y + (band - 6) / 2}" r="5" fill="${METAL_LO}"/>

  <g filter="url(#shadow)">
    <rect x="${phone.x - 4}" y="${phone.y - 4}" width="${phone.w + 8}" height="${phone.h + 8}" rx="${phone.r + 4}" fill="url(#phoneRim)"/>
    <rect x="${phone.x}" y="${phone.y}" width="${phone.w}" height="${phone.h}" rx="${phone.r}" fill="${GLASS}"/>
  </g>
  <rect x="${phone.x - 7}" y="${phone.y + 180}" width="4" height="64" rx="2" fill="${METAL}"/>
  <rect x="${phone.x - 7}" y="${phone.y + 262}" width="4" height="64" rx="2" fill="${METAL}"/>
  <rect x="${phone.x + phone.w + 3}" y="${phone.y + 230}" width="4" height="104" rx="2" fill="${METAL}"/>
  <g clip-path="url(#phoneScreen)">
    <rect x="${ps.x}" y="${ps.y}" width="${ps.w}" height="${ps.h}" fill="${c.ground}"/>
    <image x="${ps.x}" y="${ps.y + statusHeight}" width="${ps.w}" height="${ps.h - statusHeight}" xlink:href="${phonePage}" preserveAspectRatio="xMidYMid slice"/>
  </g>
  ${statusBar()}
  <rect x="${ps.x + ps.w / 2 - 63 * pt}" y="${ps.y + 11 * pt}" width="${126 * pt}" height="${37 * pt}" rx="${18.5 * pt}" fill="${GLASS}"/>
</svg>`;

await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile(new URL('docs/images/screenshot.png', root).pathname);
console.log('wrote docs/images/screenshot.png');
