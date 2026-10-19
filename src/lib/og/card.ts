// The social share cards (Open Graph images): 1200 × 630, dark only. Each variant is a small tree of
// elements that Satori lays out (see render.ts). Colours come from design/tokens.json (dark values),
// sizes from the ShareCard note in design/system/.
import tokens from '../../../design/tokens.json';

export type Card =
  /** The home page, and the default for any page without its own card. */
  | { kind: 'home'; headline: string[]; lead: string; line: string }
  | { kind: 'post'; topic?: string | undefined; title: string; date: string }
  | { kind: 'project'; name: string; summary: string; host?: string | undefined }
  /** blog, topic, projects, rss: the page title, its intro and its address. */
  | { kind: 'page'; title: string; intro?: string | undefined; address: string };

export const WIDTH = 1200;
export const HEIGHT = 630;

const dark = (name: string): string => {
  const token = tokens.color.tokens.find((t) => t.name === name);
  if (!token) throw new Error(`design/tokens.json: no colour token "${name}"`);
  return token.value.dark;
};
const C = {
  ground: dark('ground'),
  text: dark('text'),
  muted: dark('muted'),
  accent: dark('accent'),
  link: dark('link'),
  cloudBrick: dark('cloud-brick'),
  cloudApricot: dark('cloud-apricot'),
  ring: dark('signal-ring'),
};

const MONO = 'Martian Mono';
const SANS = 'Schibsted Grotesk';

/** A post title steps down from 68px to 60px past this many characters (about two lines). */
export const LONG_TITLE = 48;
/**
 * Past this many it can't fit three lines, so it's cut at three with an ellipsis. Shorter titles wrap
 * balanced instead (Satori can't do both: balancing first makes the cut come early).
 */
export const OVERLONG_TITLE = 72;
/** The width the text may use. */
const MEASURE = 900;
/** Martian Mono is monospaced: every character advances 0.7em, less 0.05em of letter spacing. */
const monoChars = (size: number): number => Math.floor(MEASURE / (0.65 * size));

/** Greedy wrap at `width` characters. */
const wrap = (words: string[], width: number): string[] => {
  const lines: string[] = [];
  for (const word of words) {
    const last = lines.at(-1);
    if (last !== undefined && last.length + 1 + word.length <= width)
      lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
};

/**
 * A Martian Mono title broken into balanced lines (exact, since every character is the same width).
 * `extra` reserves room on the last line, for the brick stop.
 */
export function monoLines(text: string, size: number, extra = 0): string[] {
  const words = text.split(/\s+/);
  const max = monoChars(size);
  const lines = wrap(words, max - extra);
  // The narrowest width that still gives that many lines.
  for (let width = Math.ceil(text.length / lines.length); width < max - extra; width++) {
    const tried = wrap(words, width);
    if (tried.length === lines.length) return tried;
  }
  return lines;
}

/** A project name or page title is 104px when it fits one line, otherwise 72px (two lines at most). */
export const monoSize = (text: string, extra = 0): number =>
  text.length + extra <= monoChars(104) ? 104 : 72;

type Style = Record<string, string | number>;
export interface El {
  type: string;
  props: { style?: Style; children?: Array<El | string> | El | string; [key: string]: unknown };
}

/** An element. Satori wants a lone child passed bare: an array of children needs display: flex. */
const h = (type: string, style: Style, ...children: Array<El | string | false | undefined>): El => {
  const kids = children.filter((c): c is El | string => Boolean(c));
  return {
    type,
    props: { style, ...(kids.length ? { children: kids.length === 1 ? kids[0] : kids } : {}) },
  };
};

/**
 * The brick full stop after a Martian Mono title, sized to the type and resting on the baseline.
 * Martian Mono's ascent and descent are 1em and 0.2em, so the baseline sits 0.2em plus half the
 * leading above the bottom of the line.
 */
const stop = (size: number, lineHeight: number): El =>
  h('div', {
    width: size * 0.19,
    height: size * 0.19,
    marginLeft: size * 0.28,
    marginBottom: size * (0.2 + (lineHeight - 1.2) / 2),
    borderRadius: 999,
    background: C.accent,
    flexShrink: 0,
  });

/** A Martian Mono title, one element per line; the last line ends in the brick stop. */
const monoTitle = (lines: string[], size: number, lineHeight: number, withStop = true): El =>
  h(
    'div',
    { display: 'flex', flexDirection: 'column', marginLeft: -0.045 * size },
    ...lines.map((line, i) =>
      h(
        'div',
        {
          display: 'flex',
          alignItems: 'flex-end',
          fontFamily: MONO,
          fontSize: size,
          fontWeight: 500,
          lineHeight,
          letterSpacing: -0.05 * size,
          color: C.text,
        },
        line,
        withStop && i === lines.length - 1 && stop(size, lineHeight),
      ),
    ),
  );

const eyebrow = (text: string): El =>
  h(
    'div',
    { fontFamily: MONO, fontSize: 22, letterSpacing: -0.44, color: C.link, marginBottom: 28 },
    text,
  );

const subStyle: Style = {
  marginTop: 28,
  maxWidth: 820,
  fontSize: 30,
  lineHeight: 1.4,
  color: C.muted,
};

const sub = (...children: Array<El | string>): El =>
  h('div', { display: 'flex', flexDirection: 'column', ...subStyle }, ...children);

/** One paragraph under a title, cut with an ellipsis after `lines`. */
const para = (text: string, lines: number): El =>
  h('div', { display: 'block', ...subStyle, lineClamp: lines }, text);

const mark = (): El => ({
  type: 'svg',
  props: {
    width: 40,
    height: 40,
    viewBox: '0 0 100 100',
    children: [
      {
        type: 'path',
        props: {
          d: 'M30 10 V90 M30 58 C30 44 39 38 50 38 C61 38 70 44 70 58 V72',
          fill: 'none',
          stroke: C.text,
          'stroke-width': 11,
          'stroke-linecap': 'round',
        },
      },
      { type: 'circle', props: { cx: 70, cy: 88, r: 7.5, fill: C.accent } },
    ],
  },
});

const footer = (detail: string): El =>
  h(
    'div',
    { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    h(
      'div',
      {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: -0.48,
      },
      mark(),
      'harrison jennings',
    ),
    h(
      'div',
      {
        // The room beside the lockup: a topic page's full address fits.
        maxWidth: 740,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        fontFamily: MONO,
        fontSize: 20,
        color: C.muted,
      },
      detail,
    ),
  );

/** The first sentence: a project's summary is a paragraph, the card has room for one line or two. */
export const firstSentence = (text: string): string => text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;

function body(card: Card): El {
  switch (card.kind) {
    case 'home':
      return h(
        'div',
        { display: 'flex', flexDirection: 'column' },
        monoTitle(card.headline, 96, 1.08),
        sub(h('div', { color: C.text }, card.lead), card.line),
      );
    case 'post': {
      const size = card.title.length > LONG_TITLE ? 60 : 68;
      return h(
        'div',
        { display: 'flex', flexDirection: 'column' },
        card.topic && eyebrow(`blog / ${card.topic}`),
        h(
          'div',
          {
            display: 'block',
            fontSize: size,
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: -0.03 * size,
            color: C.text,
            ...(card.title.length > OVERLONG_TITLE ? { lineClamp: 3 } : { textWrap: 'balance' }),
          },
          card.title,
        ),
      );
    }
    case 'project':
      return h(
        'div',
        { display: 'flex', flexDirection: 'column' },
        eyebrow('project'),
        monoTitle(monoLines(card.name, monoSize(card.name)), monoSize(card.name), 1, false),
        para(firstSentence(card.summary), 2),
        card.host &&
          h(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginTop: 28,
              fontSize: 24,
              color: C.muted,
            },
            h('div', {
              width: 14,
              height: 14,
              borderRadius: 999,
              background: C.accent,
              boxShadow: `0 0 0 7px ${C.ring}`,
            }),
            `live at ${card.host}`,
          ),
      );
    case 'page':
      return h(
        'div',
        { display: 'flex', flexDirection: 'column' },
        monoTitle(monoLines(card.title, monoSize(card.title, 1), 1), monoSize(card.title, 1), 1.08),
        card.intro && para(card.intro, 3),
      );
  }
}

const detail = (card: Card): string =>
  card.kind === 'post'
    ? card.date
    : card.kind === 'project'
      ? 'harrisonjennings.au/projects'
      : card.kind === 'page'
        ? card.address
        : 'harrisonjennings.au';

/** "rgba(200,90,82,0.75)" → an SVG colour and opacity. */
const svgColour = (rgba: string): { colour: string; opacity: number } => {
  const [r, g, b, a = '1'] = rgba.match(/[\d.]+/g) ?? [];
  return { colour: `rgb(${r},${g},${b})`, opacity: Number(a) };
};

/**
 * The ember clouds as SVG, drawn behind the card: two radial ellipses, as in the site's
 * radial-gradient(60% 80% at 88% 12%, cloud-brick, transparent 70%) and (50% 70% at 100% 100%,
 * cloud-apricot, transparent 70%). Fainter (60%) behind the text-heavy post and page cards.
 */
export function cloudsSvg(card: Card): string {
  const quiet = card.kind === 'post' || card.kind === 'page';
  const ellipse = (id: string, rgba: string, x: number, y: number, rx: number, ry: number) => {
    const { colour, opacity } = svgColour(rgba);
    const [cx, cy] = [x * WIDTH, y * HEIGHT];
    return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${rx * WIDTH}" gradientTransform="translate(${cx} ${cy}) scale(1 ${(ry * HEIGHT) / (rx * WIDTH)}) translate(${-cx} ${-cy})"><stop offset="0" stop-color="${colour}" stop-opacity="${opacity}"/><stop offset="0.7" stop-color="${colour}" stop-opacity="0"/></radialGradient>`;
  };
  return [
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="${C.ground}"/>`,
    `<defs>${ellipse('brick', C.cloudBrick, 0.88, 0.12, 0.6, 0.8)}${ellipse('apricot', C.cloudApricot, 1, 1, 0.5, 0.7)}</defs>`,
    `<g opacity="${quiet ? 0.6 : 0.85}">`,
    // The apricot cloud sits under the brick one.
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#apricot)"/>`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#brick)"/>`,
    `</g>`,
  ].join('');
}

/** The card's content over the clouds: the text, then the lockup and a detail. */
export function cardElement(card: Card): El {
  return h(
    'div',
    {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: WIDTH,
      height: HEIGHT,
      padding: '72px 80px 64px',
      color: C.text,
      fontFamily: SANS,
    },
    h('div', { display: 'flex', flexDirection: 'column', maxWidth: 900 }, body(card)),
    footer(detail(card)),
  );
}
