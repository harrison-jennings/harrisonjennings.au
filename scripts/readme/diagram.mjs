// The README's architecture diagram: writes docs/images/architecture-dark.svg and -light.svg.
// Every colour comes from design/tokens.json, and the text is drawn as outlines from the site's own
// fonts, because GitHub shows README images without loading web fonts. Run `npm run readme:diagram`
// after changing the stack, then commit both files.
//
// Logos (logos/): Simple Icons and SVG Logos (CC0), Cloudflare's D1 icon from its docs (CC BY 4.0),
// Playwright's mark from its docs, and Twemoji (CC BY 4.0). Credited in the README's licence section.
import opentype from '@shuding/opentype.js'; // installed with Satori, which the share cards use
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root));

const font = (file) => {
  const b = read(`src/assets/fonts/${file}`);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};
const FONTS = {
  mono: font('MartianMono-Medium.ttf'),
  body: font('SchibstedGrotesk-Regular.ttf'),
  bold: font('SchibstedGrotesk-SemiBold.ttf'),
};

const tokens = JSON.parse(read('design/tokens.json'));
const palette = (theme) =>
  Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t.value[theme]]));

// Each product's own colour, as Simple Icons lists it; null means monochrome (drawn in the text colour).
const BRAND = {
  github: null,
  markdown: null,
  astro: '#BC52EE',
  vite: '#646CFF',
  cloudflare: '#F38020',
  cloudflareworkers: '#F38020',
  d1: '#F38020',
  googletagmanager: '#246FDB',
  googleanalytics: '#E37400',
  eslint: '#4B32C3',
  prettier: '#F7B93E',
  typescript: '#3178C6',
  vitest: '#729B1B',
  lighthouse: '#F44B21',
  dependabot: '#025E8C',
};
// Logos drawn in their own published colours.
const OWN_COLOURS = ['playwright', 'googlecloudrun', 'hammer-and-wrench', 'rocket'];
// Line icons, in the brand's brick, for the two cards that are a person and a choice.
const LINE_ICONS = {
  person: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  cookie:
    '<path d="M21 12.4A9 9 0 1 1 11.6 3a3.2 3.2 0 0 0 3.9 3.9 3.2 3.2 0 0 0 3.6 3.6 2.6 2.6 0 0 0 1.9 1.9z"/><path d="M8.5 9.5h.01M12 13h.01M8 15.5h.01M15.5 16h.01M12 17.5h.01"/>',
};

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function logo(name, x, y, size, c) {
  const box = `x="${x}" y="${y}" width="${size}" height="${size}"`;
  if (LINE_ICONS[name]) {
    return `<svg ${box} viewBox="0 0 24 24" fill="none" stroke="${c.link}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${LINE_ICONS[name]}</svg>`;
  }
  const svg = read(`scripts/readme/logos/${name}.svg`).toString();
  const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
  const inner = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<title>.*?<\/title>/, '');
  if (OWN_COLOURS.includes(name)) return `<svg ${box} viewBox="${viewBox}">${inner}</svg>`;
  // A brand colour too faint against the card (under 2:1) falls back to the text colour.
  const brand = BRAND[name];
  const fill = brand && contrast(brand, c.surface) >= 2 ? brand : c.text;
  return `<svg ${box} viewBox="${viewBox}"><g fill="${fill}">${inner}</g></svg>`;
}

const measure = (str, face, size, spacing = 0) =>
  FONTS[face].getAdvanceWidth(str, size) + spacing * Math.max(0, [...str].length - 1);

function text(str, x, y, { face = 'body', size = 18, fill, anchor = 'start', spacing = 0 }) {
  const f = FONTS[face];
  const width = measure(str, face, size, spacing);
  let cx = anchor === 'middle' ? x - width / 2 : x;
  if (!spacing) return `<path d="${f.getPath(str, cx, y, size).toPathData(1)}" fill="${fill}"/>`;
  let d = '';
  for (const ch of str) {
    d += f.getPath(ch, cx, y, size).toPathData(1);
    cx += f.getAdvanceWidth(ch, size) + spacing;
  }
  return `<path d="${d}" fill="${fill}"/>`;
}

// Layout, in SVG units
const W = 1480;
const M = 48;
const GAP = 72;
const COL = (W - 2 * M - 2 * GAP) / 3;
const colX = (i) => M + i * (COL + GAP);
const PAD = 20;
const LINE = 24;
const ICON = 24;
const SMALL = 17;
const ARROW = 46;
const TOP = 236;

const cardHeight = (card) => PAD + 26 + card.lines.length * LINE + PAD - 4;

function drawCard(card, x, y, w, h, c) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${c.surface}" stroke="${c.line}" stroke-width="1.25"/>`;
  let tx = x + PAD;
  const ty = y + PAD + 20;
  for (const l of card.logos ?? []) {
    s += logo(l, tx, ty - 19, ICON, c);
    tx += ICON + 12;
  }
  s += text(card.title, tx, ty, { face: 'bold', size: 21, fill: c.text });
  (card.tools ?? []).forEach((l, k, all) => {
    s += logo(l, x + w - PAD - ICON - (all.length - 1 - k) * (ICON + 8), y + PAD + 1, ICON, c);
  });
  // Lines with logos share one text column, set by the line with the most.
  const most = Math.max(0, ...card.lines.map((l) => l.logos?.length ?? 0));
  const indent = most ? most * (SMALL + 6) + 4 : 0;
  card.lines.forEach((line, i) => {
    const ly = ty + 30 + i * LINE;
    const { text: words, logos = [] } = typeof line === 'string' ? { text: line } : line;
    logos.forEach((l, k) => (s += logo(l, x + PAD + k * (SMALL + 6), ly - 13.5, SMALL, c)));
    s += text(words, x + PAD + indent, ly, { size: 16.5, fill: c.muted });
  });
  return s;
}

function arrowDown(x, y1, y2, c, label) {
  let s = `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2 - 7}" stroke="${c.muted}" stroke-opacity="0.55" stroke-width="1.75"/>`;
  s += `<path d="M${x - 5.5} ${y2 - 9} L${x} ${y2 - 1} L${x + 5.5} ${y2 - 9}" fill="none" stroke="${c.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (label)
    s += text(label, x + 12, (y1 + y2) / 2 + 4.5, { face: 'mono', size: 12.5, fill: c.muted });
  return s;
}

/** A dashed brick link between bands, ending in a horizontal arrowhead. */
function connector(points, c) {
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  const [ex, ey] = points.at(-1);
  const dir = Math.sign(ex - points.at(-2)[0]);
  return (
    `<path d="${d}" fill="none" stroke="${c.accent}" stroke-opacity="0.85" stroke-width="1.75" stroke-dasharray="5 6" stroke-linejoin="round"/>` +
    `<path d="M${ex - dir * 9} ${ey - 5.5} L${ex - dir} ${ey} L${ex - dir * 9} ${ey + 5.5}" fill="none" stroke="${c.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

/** A label turned to run up a vertical link. */
function sideLabel(label, x, y, c) {
  const w = measure(label, 'mono', 12.5) + 16;
  return `<g transform="rotate(-90 ${x} ${y})"><rect x="${x - w / 2}" y="${y - 11}" width="${w}" height="22" rx="11" fill="${c.ground}"/>${text(label, x, y + 4.5, { face: 'mono', size: 12.5, fill: c.link, anchor: 'middle' })}</g>`;
}

/**
 * @typedef {string | { logos: string[]; text: string }} Line
 * @typedef {{ id: string; title: string; lines: Line[]; logos?: string[]; tools?: string[]; arrow?: string; from?: string }} Card
 * @typedef {Card | { split: Card[]; arrows: string[] }} Slot
 * @type {Array<{ n: string; name: string; note: string; cards: Slot[] }>}
 */
const COLUMNS = [
  {
    n: '01',
    name: 'build',
    note: 'from Markdown to a deploy',
    cards: [
      {
        id: 'author',
        logos: ['markdown'],
        title: 'Markdown in VS Code',
        lines: ['posts, pages and data in the repo; no CMS'],
      },
      {
        id: 'github',
        logos: ['github'],
        title: 'GitHub',
        lines: ['a branch and a pull request for every change'],
        arrow: 'pull request',
      },
      {
        id: 'ci',
        logos: ['hammer-and-wrench'],
        title: 'CI Orchestrator',
        lines: [
          { logos: ['prettier', 'eslint', 'typescript'], text: 'format, lint, types and build' },
          {
            logos: ['vitest', 'playwright', 'lighthouse'],
            text: 'unit, end-to-end, Lighthouse 95+',
          },
          { logos: ['github', 'dependabot'], text: 'CodeQL, dependency review' },
        ],
        arrow: 'every push',
      },
      {
        id: 'builds',
        logos: ['cloudflareworkers'],
        title: 'Workers Builds',
        tools: ['astro', 'vite'],
        lines: [
          'Astro builds static pages, share cards,',
          'sitemap, feeds, structured data',
          'and the CSP with inline-script hashes',
          'every branch: a preview behind Access',
        ],
        arrow: 'merge to main',
      },
      {
        id: 'cd',
        logos: ['rocket'],
        title: 'CD Orchestrator',
        tools: ['github'],
        lines: ['smoke-tests every preview and', 'production version, records deployments'],
        arrow: 'after each deploy',
      },
    ],
  },
  {
    n: '02',
    name: 'serve',
    note: 'static first, code only where needed',
    cards: [
      { id: 'visitor', logos: ['person'], title: 'a visitor', lines: ['www.harrisonjennings.au'] },
      {
        id: 'edge',
        logos: ['cloudflare'],
        title: 'Cloudflare edge',
        lines: [
          'bare domain 301s to www',
          'Bot Fight Mode, rate limit on /api/*',
          'HSTS and security headers',
        ],
        arrow: 'https',
      },
      {
        arrows: ['pages', '/api/*'],
        split: [
          {
            id: 'assets',
            logos: ['cloudflareworkers'],
            title: 'static assets',
            lines: ['every page and file,', 'no code runs'],
          },
          {
            id: 'worker',
            logos: ['cloudflareworkers'],
            title: 'Worker',
            lines: ['/api/* only:', 'consent, CSP reports'],
          },
        ],
      },
      {
        id: 'd1',
        logos: ['d1'],
        title: 'D1',
        from: 'worker',
        lines: [
          'consent log, IP stored only as a keyed hash',
          'CSP reports, counted per violation',
          'daily cron deletes past retention',
        ],
        arrow: 'writes',
      },
    ],
  },
  {
    n: '03',
    name: 'measure',
    note: 'consent before any measurement',
    cards: [
      {
        id: 'consent',
        logos: ['cookie'],
        title: 'cookie banner',
        lines: ['Google Advanced Consent Mode v2:', 'denied by default, updated on each choice'],
      },
      {
        id: 'gtm',
        logos: ['googletagmanager'],
        title: 'Tag Manager',
        lines: ['loaded first-party from', 'measure.harrisonjennings.au'],
        arrow: 'after the default',
      },
      {
        id: 'sgtm',
        logos: ['googletagmanager'],
        title: 'server-side tagging',
        tools: ['cloudflareworkers', 'googlecloudrun'],
        lines: ['a Worker proxy in front of', 'Tag Manager’s server container (Cloud Run)'],
        arrow: 'events',
      },
      {
        id: 'ga4',
        logos: ['googleanalytics'],
        title: 'Google Analytics 4',
        lines: ['production or testing property,', 'picked by the environment label'],
        arrow: 'routed',
      },
    ],
  },
];

const CHIPS = [
  'no client framework',
  'Lighthouse 95+ enforced in CI',
  'every old URL kept or 301’d',
  'consent records kept 12 months',
];

function render(theme) {
  const c = palette(theme);
  const parts = [];
  const pos = {};

  const heading = 'how harrisonjennings.au is built';
  parts.push(text(heading, M, 84, { face: 'mono', size: 30, fill: c.text, spacing: -0.6 }));
  parts.push(
    `<circle cx="${M + measure(heading, 'mono', 30, -0.6) + 10}" cy="80" r="5" fill="${c.accent}"/>`,
  );
  parts.push(
    text(
      'A static Astro site on Cloudflare Workers, with a Worker only where data is stored.',
      M,
      122,
      { size: 19, fill: c.muted },
    ),
  );

  let bottom = 0;
  COLUMNS.forEach((col, i) => {
    const x = colX(i);
    parts.push(text(col.n, x, TOP - 40, { face: 'mono', size: 13, fill: c.link }));
    parts.push(text(col.name, x + 34, TOP - 40, { face: 'mono', size: 22, fill: c.text }));
    parts.push(
      `<circle cx="${x + 34 + measure(col.name, 'mono', 22) + 7}" cy="${TOP - 43}" r="3.5" fill="${c.accent}"/>`,
    );
    parts.push(text(col.note, x, TOP - 14, { size: 15, fill: c.muted }));
    let y = TOP + 6;
    col.cards.forEach((card, j) => {
      const half = (COL - 16) / 2;
      if (j > 0) {
        if (card.split) {
          [x + half / 2, x + half + 16 + half / 2].forEach((ax, k) =>
            parts.push(arrowDown(ax, y, y + ARROW, c, card.arrows[k])),
          );
        } else {
          const from = card.from ? pos[card.from] : { x, w: COL };
          parts.push(arrowDown(from.x + from.w / 2, y, y + ARROW, c, card.arrow));
        }
        y += ARROW;
      }
      if (card.split) {
        const h = Math.max(...card.split.map(cardHeight));
        card.split.forEach((sub, k) => {
          const sx = x + k * (half + 16);
          parts.push(drawCard(sub, sx, y, half, h, c));
          pos[sub.id] = { x: sx, y, w: half, h };
        });
        y += h;
      } else {
        const h = cardHeight(card);
        parts.push(drawCard(card, x, y, COL, h, c));
        pos[card.id] = { x, y, w: COL, h };
        y += h;
      }
    });
    bottom = Math.max(bottom, y);
  });

  // What crosses between bands: a deploy landing on the static assets, the banner in every page.
  const { builds, assets, visitor, consent } = pos;
  const mid = colX(0) + COL + GAP / 2;
  parts.push(
    connector(
      [
        [builds.x + builds.w + 2, builds.y + 40],
        [mid, builds.y + 40],
        [mid, assets.y + 40],
        [assets.x - 2, assets.y + 40],
      ],
      c,
    ),
  );
  parts.push(sideLabel('deploys', mid, (builds.y + assets.y) / 2 + 40, c));
  parts.push(
    connector(
      [
        [visitor.x + visitor.w + 2, visitor.y + 34],
        [consent.x - 2, consent.y + 34],
      ],
      c,
    ),
  );

  let cx = M;
  let cy = bottom + 56;
  for (const chip of CHIPS) {
    const w = measure(chip, 'mono', 13) + 30;
    if (cx + w > W - M) {
      cx = M;
      cy += 44;
    }
    parts.push(
      `<rect x="${cx}" y="${cy - 20}" width="${w}" height="32" rx="16" fill="none" stroke="${c.line}" stroke-width="1.25"/>`,
    );
    parts.push(text(chip, cx + 15, cy + 1, { face: 'mono', size: 13, fill: c.muted }));
    cx += w + 10;
  }
  const H = cy + 48;

  const glow = `<defs><radialGradient id="glow" cx="0.86" cy="0.08" r="0.5"><stop offset="0" stop-color="${c.accent}" stop-opacity="${theme === 'dark' ? 0.22 : 0.14}"/><stop offset="1" stop-color="${c.accent}" stop-opacity="0"/></radialGradient></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="How harrisonjennings.au is built: build, serve and measure">${glow}<rect width="${W}" height="${H}" rx="24" fill="${c.ground}"/><rect width="${W}" height="${H}" rx="24" fill="url(#glow)"/>${parts.join('')}</svg>\n`;
}

const out = new URL('docs/images/', root);
mkdirSync(out, { recursive: true });
for (const theme of ['dark', 'light'])
  writeFileSync(new URL(`architecture-${theme}.svg`, out), render(theme));
console.log('wrote docs/images/architecture-dark.svg and architecture-light.svg');
