import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  HEIGHT,
  LONG_TITLE,
  MEASURE,
  WIDTH,
  firstSentence,
  monoLines,
  monoSize,
  type Card,
} from '../../src/lib/og/card';
import { cardImagePath } from '../../src/lib/og/cards';
import { cardSvg, renderCard } from '../../src/lib/og/render';

describe('share card text', () => {
  it('keeps short Martian Mono titles at 104px and steps long ones down to 72px', () => {
    expect(monoSize('leadlens')).toBe(104);
    expect(monoSize('projects', 1)).toBe(104);
    expect(monoSize('api reference for marketo engage')).toBe(72);
  });

  it('breaks a long title into balanced lines, leaving room for the stop', () => {
    expect(monoLines('api reference for marketo engage', 72)).toEqual([
      'api reference for',
      'marketo engage',
    ]);
    expect(monoLines('adobe marketo engage', 72, 1)).toEqual(['adobe marketo', 'engage']);
    expect(monoLines('blog', 104, 1)).toEqual(['blog']);
  });

  it("takes a project summary's first sentence", () => {
    expect(firstSentence('Email previews, inside VS Code. Reads Email Editor 2.0 templates.')).toBe(
      'Email previews, inside VS Code.',
    );
    expect(firstSentence('No full stop here')).toBe('No full stop here');
  });

  it('publishes each card at /og/<page path>.png', () => {
    expect(cardImagePath('/')).toBe('/og/index.png');
    expect(cardImagePath('/blog/')).toBe('/og/blog.png');
    expect(cardImagePath('/blog/topic/cloud/')).toBe('/og/blog/topic/cloud.png');
  });
});

describe('rendering', () => {
  const cards: Card[] = [
    { kind: 'home', headline: ['marketing,', 'engineered'], lead: 'Lead.', line: 'Line.' },
    { kind: 'post', topic: 'cloud', title: 'a title', date: '13 August 2026' },
    { kind: 'project', name: 'leadlens', summary: 'Summary.', host: 'leadlens.example' },
    { kind: 'page', title: 'blog', intro: 'Intro.', address: 'harrisonjennings.au/blog' },
  ];

  it.each(cards)('renders the $kind card as a 1200 × 630 PNG', async (card) => {
    const meta = await sharp(await renderCard(card)).metadata();
    expect(meta).toMatchObject({ format: 'png', width: WIDTH, height: HEIGHT });
  });
});

// These check where a card's ink lands, not how it's drawn, so any Satori that lays the card out
// properly passes, whatever its version and whichever way it wraps a line.
describe('what each card shows', () => {
  const MARGIN = 80;
  /** Everything above this is the title and text; the footer sits below it. */
  const FOOTER_TOP = 500;
  /** Room for a glyph's overhang and antialiasing. */
  const SLACK = 6;
  /** The logo's artwork starts this far inside its box. */
  const LOGO_INSET = 12;
  /** Where the lockup has ended and even the longest address hasn't begun. */
  const FOOTER_GAP = [340, 375] as const;

  type Post = Extract<Card, { kind: 'post' }>;
  type Box = { left: number; right: number; top: number; bottom: number };
  type Ink = (left: number, top: number, right: number, bottom: number) => Box | undefined;

  /** Measures the ink inside a region of the card: undefined if it's empty. */
  const inkOf = async (card: Card): Promise<Ink> => {
    const svg = Buffer.from(await cardSvg(card));
    const alpha = await sharp(svg).ensureAlpha().extractChannel(3).raw().toBuffer();
    return (left, top, right, bottom) => {
      let box: Box | undefined;
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          if ((alpha[y * WIDTH + x] ?? 0) < 128) continue;
          box = {
            left: Math.min(box?.left ?? x, x),
            right: Math.max(box?.right ?? x, x),
            top: box?.top ?? y,
            bottom: y,
          };
        }
      }
      return box;
    };
  };

  const date = '13 August 2026';
  const longTitle = 'when your website gets attacked before anyone even visits';
  const overlongTitle = 'a title far too long for any share card, '.repeat(4).trim();
  const longestAddress = 'harrisonjennings.au/blog/topic/adobe-marketo-engage';
  const cards: Array<[string, Card]> = [
    [
      'home',
      { kind: 'home', headline: ['marketing,', 'engineered'], lead: 'Lead.', line: 'Line.' },
    ],
    ['short post', { kind: 'post', title: "what's this all about?", date }],
    ['long post', { kind: 'post', topic: 'cloud', title: longTitle, date }],
    ['overlong post', { kind: 'post', title: overlongTitle, date }],
    ['overlong post with a topic', { kind: 'post', topic: 'cloud', title: overlongTitle, date }],
    [
      'project',
      { kind: 'project', name: 'leadlens', summary: 'Summary.', host: 'leadlens.example' },
    ],
    [
      'long project',
      {
        kind: 'project',
        name: 'api reference for marketo engage',
        summary: `${'A searchable reference, generated from the specifications, '.repeat(3)}and more.`,
        host: 'mkto-ref.example',
      },
    ],
    ['page', { kind: 'page', title: 'blog', intro: 'Intro.', address: 'harrisonjennings.au/blog' }],
    ['topic page', { kind: 'page', title: 'adobe marketo engage', address: longestAddress }],
  ];

  it.each(cards)('%s: the lockup on the left, the detail on the right', async (_, card) => {
    const ink = await inkOf(card);
    const lockup = ink(0, FOOTER_TOP, FOOTER_GAP[0], HEIGHT);
    const detail = ink(Math.round(WIDTH * 0.8), FOOTER_TOP, WIDTH, HEIGHT);
    expect(lockup, 'the footer lockup').toBeDefined();
    expect(detail, 'the footer date or address').toBeDefined();
    expect(lockup?.left).toBeGreaterThanOrEqual(MARGIN - SLACK);
    expect(lockup?.left).toBeLessThanOrEqual(MARGIN + LOGO_INSET + SLACK);
    expect(lockup?.bottom).toBeLessThanOrEqual(HEIGHT - 64 + SLACK);
    expect(detail?.right).toBeGreaterThanOrEqual(WIDTH - MARGIN - SLACK);
    expect(detail?.right).toBeLessThanOrEqual(WIDTH - MARGIN + SLACK);
    expect(ink(FOOTER_GAP[0], FOOTER_TOP, FOOTER_GAP[1], HEIGHT), 'a gap between them').toBe(
      undefined,
    );
  });

  it.each(cards)('%s: the text stays inside the measure', async (_, card) => {
    const ink = await inkOf(card);
    expect(ink(0, 0, WIDTH, FOOTER_TOP), 'the title and text').toBeDefined();
    expect(ink(MARGIN + MEASURE + SLACK, 0, WIDTH, FOOTER_TOP), 'ink past the measure').toBe(
      undefined,
    );
  });

  it.each(cards.filter((c): c is [string, Post] => c[1].kind === 'post'))(
    '%s: the title runs to three lines at most',
    async (_, card) => {
      const size = card.title.length > LONG_TITLE ? 60 : 68;
      const lowest = 72 + (card.topic ? 56 : 0) + 3 * size * 1.1 + SLACK;
      const ink = await inkOf(card);
      expect(ink(0, 0, WIDTH, FOOTER_TOP)?.bottom).toBeLessThanOrEqual(lowest);
    },
  );
});
