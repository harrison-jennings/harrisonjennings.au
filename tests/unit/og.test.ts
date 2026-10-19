import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  HEIGHT,
  WIDTH,
  firstSentence,
  monoLines,
  monoSize,
  type Card,
} from '../../src/lib/og/card';
import { cardImagePath } from '../../src/lib/og/cards';
import { renderCard } from '../../src/lib/og/render';

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
