import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildTokensCss } from '../../scripts/build-tokens.mjs';

type Tokens = Parameters<typeof buildTokensCss>[0];

const real = JSON.parse(readFileSync(new URL('../../design/tokens.json', import.meta.url), 'utf8'));

const fixture = (overrides: Record<string, unknown> = {}): Tokens => ({
  name: 'Test brand',
  color: {
    themes: [{ id: 'dark' }, { id: 'light' }],
    tokens: [
      { name: 'ground', value: { dark: '#000', light: '#fff' } },
      { name: 'accent', value: '#c85a52' },
      { name: 'line', value: { dark: '#333' } },
    ],
  },
  shadow: { tokens: [{ name: 'shadow-1', value: { dark: 'none', light: '0 1px 2px #0002' } }] },
  spacing: { tokens: [{ name: 'space-4', value: '4px' }] },
  radius: { tokens: [{ name: 'radius-pill', value: '999px' }] },
  type: {
    families: { display: '"Mono", monospace', sans: '"Sans", sans-serif' },
    fonts: [
      { family: 'Mono', file: 'fonts/Mono.ttf', weight: '100 800' },
      { family: 'Sans', file: 'fonts/Sans-Italic.woff2', weight: '400 900', style: 'italic' },
    ],
    groups: [
      {
        family: 'display',
        styles: [
          { name: 'display-l', fontSize: '46px', lineHeight: 1.1, letterSpacing: '-0.05em' },
          { name: 'body', family: 'sans', fontSize: '16px' },
        ],
      },
    ],
  },
  ...overrides,
});

/** The declarations inside the first block that opens with `selector {`. */
const blockAfter = (css: string, selector: string) => {
  const start = css.indexOf(`${selector} {`);
  expect(start, `no block for ${selector}`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('}', start));
};

describe('buildTokensCss with design/tokens.json', () => {
  const { css, themed, scalar } = buildTokensCss(real);
  const primary = real.color.themes[0].id;

  it('writes every themed token for the default theme on :root', () => {
    const block = blockAfter(css, `:root, [data-theme='${primary}']`);
    for (const t of real.color.tokens) {
      const value = typeof t.value === 'string' ? t.value : t.value[primary];
      expect(block).toContain(`--${t.name}: ${value};`);
    }
    expect(themed).toBe(real.color.tokens.length + (real.shadow?.tokens.length ?? 0));
  });

  it('writes each other theme under its data-theme attribute only', () => {
    for (const { id } of real.color.themes.slice(1)) {
      const forced = blockAfter(css, `[data-theme='${id}']`);
      for (const t of real.color.tokens) {
        const value = typeof t.value === 'string' ? t.value : (t.value[id] ?? t.value[primary]);
        expect(forced).toContain(`--${t.name}: ${value};`);
      }
    }
  });

  it('writes the spacing, radius and size tokens and the font families', () => {
    const families = ['spacing', 'radius', 'size'].flatMap((f) => real[f]?.tokens ?? []);
    expect(scalar).toBe(families.length);
    for (const t of families) expect(css).toContain(`--${t.name}: ${t.value};`);
    for (const k of Object.keys(real.type.families)) expect(css).toContain(`--font-${k}: `);
  });

  it('writes a @font-face for every font and a class for every type style', () => {
    expect(css.match(/@font-face \{/g)).toHaveLength(real.type.fonts.length);
    for (const group of real.type.groups) {
      for (const style of group.styles) expect(css).toContain(`.type-${style.name} {`);
    }
  });
});

describe('buildTokensCss', () => {
  it('uses a plain string value in every theme', () => {
    const { css } = buildTokensCss(fixture());
    expect(blockAfter(css, ":root, [data-theme='dark']")).toContain('--accent: #c85a52;');
    expect(blockAfter(css, "[data-theme='light']")).toContain('--accent: #c85a52;');
  });

  it('falls back to the default theme when a theme has no value', () => {
    const { css } = buildTokensCss(fixture());
    expect(blockAfter(css, "[data-theme='light']")).toContain('--line: #333;');
  });

  it('includes shadow tokens with the colours', () => {
    const { css, themed } = buildTokensCss(fixture());
    expect(themed).toBe(4);
    expect(blockAfter(css, "[data-theme='light']")).toContain('--shadow-1: 0 1px 2px #0002;');
  });

  it('ignores the device setting: dark is the default and light needs data-theme', () => {
    const { css } = buildTokensCss(fixture());
    expect(css).not.toContain('prefers-color-scheme');
    expect(blockAfter(css, ":root, [data-theme='dark']")).toContain('--ground: #000;');
    expect(blockAfter(css, "[data-theme='light']")).toContain('--ground: #fff;');
  });

  it('points every font at a woff2 in /fonts/, defaulting to normal style', () => {
    const { css } = buildTokensCss(fixture());
    expect(css).toContain("src: url('/fonts/Mono.woff2') format('woff2');");
    expect(css).toContain("src: url('/fonts/Sans-Italic.woff2') format('woff2');");
    expect(css).toContain(
      "font-family: 'Mono';\n  src: url('/fonts/Mono.woff2') format('woff2');\n  font-weight: 100 800;\n  font-style: normal;",
    );
    expect(css).toContain('font-style: italic;');
  });

  it('writes type classes with the group family unless a style overrides it, skipping unset values', () => {
    const { css } = buildTokensCss(fixture());
    expect(css).toContain(
      '.type-display-l {\n  font-family: var(--font-display);\n  font-size: 46px;\n  line-height: 1.1;\n  letter-spacing: -0.05em;\n}',
    );
    expect(css).toContain('.type-body {\n  font-family: var(--font-sans);\n  font-size: 16px;\n}');
  });

  it('rejects a bad token name', () => {
    const tokens = fixture();
    tokens.color.tokens.push({ name: '-bad name', value: '#000' });
    expect(() => buildTokensCss(tokens)).toThrow('design/tokens.json: bad token name "-bad name"');
  });

  it('rejects a duplicate token, including across colours and shadows', () => {
    const tokens = fixture({ shadow: { tokens: [{ name: 'accent', value: 'none' }] } });
    expect(() => buildTokensCss(tokens)).toThrow('design/tokens.json: duplicate token "accent"');
  });
});
