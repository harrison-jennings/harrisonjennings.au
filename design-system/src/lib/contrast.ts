// WCAG 2 contrast, worked out at build time from the colours in design/tokens.json, so a colour change
// updates every ratio the design system shows and a new failure shows up on its own.
import { colour, type Theme } from './tokens';

/** #rrggbb or rgba(r,g,b,a) as [r, g, b, a], channels 0–255. */
export function parse(value: string): [number, number, number, number] {
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const n = Number.parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgba = value
    .match(/^rgba?\(([^)]+)\)$/)?.[1]
    ?.split(',')
    .map(Number);
  if (rgba && rgba.length >= 3) {
    const [r = 0, g = 0, b = 0, a = 1] = rgba;
    return [r, g, b, a];
  }
  throw new Error(`can't read the colour "${value}"`);
}

/** A translucent colour as it's seen over an opaque one. */
export function over(top: string, under: string): [number, number, number] {
  const [r, g, b, a] = parse(top);
  const [ur, ug, ub] = parse(under);
  return [r * a + ur * (1 - a), g * a + ug * (1 - a), b * a + ub * (1 - a)];
}

export function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function ratio(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** The contrast of one token on another in a theme, from tokens.json. */
export function contrast(fg: string, bg: string, theme: Theme): number {
  const ground = colour('ground', theme);
  const back = over(colour(bg, theme), ground);
  const [r, g, b] = back;
  const fore = over(colour(fg, theme), `rgba(${r},${g},${b},1)`);
  return ratio(fore, back);
}

/** WCAG AA for text. */
export const AA = 4.5;

/** Two decimals: "4.53:1". A ratio just under AA is rounded down, so it never reads as 4.50 and fails. */
export function format(r: number): string {
  const shown = Math.round(r * 100) / 100;
  return `${(r < AA && shown >= AA ? Math.floor(r * 100) / 100 : shown).toFixed(2)}:1`;
}
