// Every token in design/tokens.json, as the design system shows them: one list, each with its kind,
// what its copy chip copies, its value (per theme where it has two) and what it's for. Read from the
// file at build time, never retyped, so a change there reaches every page.
import data from '../../../design/tokens.json';

export type Theme = 'dark' | 'light';
export const THEMES: Theme[] = ['dark', 'light'];

export const KINDS = [
  'colour',
  'font',
  'type',
  'spacing',
  'radius',
  'size',
  'shadow',
  'motion',
] as const;
export type Kind = (typeof KINDS)[number];

export interface Value {
  /** Set when the token has a value per theme. */
  theme?: Theme;
  value: string;
}

export interface Token {
  /** As in CSS: ground, font-display, space-6; a type style's class, type-display-hero. */
  name: string;
  kind: Kind;
  /** What the copy chip copies and shows: var(--ground), or .type-display-hero. */
  copy: string;
  values: Value[];
  usage: string;
}

export interface TypeStyle {
  name: string;
  family: 'display' | 'sans';
  /** The group's name: Display, Text. */
  group: string;
  fontSize: string;
  lineHeight: number;
  fontWeight: number;
  letterSpacing?: string;
  sample: string;
  usage: string;
}

type Themed = string | Record<Theme, string>;

const themed = (value: Themed): Value[] =>
  typeof value === 'string' ? [{ value }] : THEMES.map((theme) => ({ theme, value: value[theme] }));

const cssVar = (name: string) => `var(--${name})`;

/** A colour's value for one theme. Every colour has both. */
export function colour(name: string, theme: Theme): string {
  const token = data.color.tokens.find((t) => t.name === name);
  if (!token) throw new Error(`design/tokens.json: no colour "${name}"`);
  return token.value[theme];
}

export const COLOURS = data.color.tokens;

export const TYPE_STYLES: TypeStyle[] = data.type.groups.flatMap((group) =>
  group.styles.map((s) => ({
    ...s,
    family: group.family as TypeStyle['family'],
    group: group.name,
  })),
);

export const FAMILIES = data.type.families as Record<TypeStyle['family'], string>;

/** A family's first name, without its fallbacks: "Martian Mono". */
export const familyName = (family: TypeStyle['family']): string =>
  FAMILIES[family].split(',')[0]?.replace(/"/g, '').trim() ?? family;

/** The size, line height and weight, as the type scale writes them: "96 / 1.12 · 500". */
export const typeMetrics = (s: TypeStyle): string =>
  `${s.fontSize.replace('px', '')} / ${s.lineHeight} · ${s.fontWeight}`;

const fonts: Token[] = (Object.keys(FAMILIES) as TypeStyle['family'][]).map((family) => {
  const styles = TYPE_STYLES.filter((s) => s.family === family);
  return {
    name: `font-${family}`,
    kind: 'font',
    copy: cssVar(`font-${family}`),
    values: [{ value: familyName(family) }],
    usage: `The ${family === 'display' ? 'display' : 'text'} family, for ${styles.length} type styles, from ${styles[0]?.name} to ${styles.at(-1)?.name}.`,
  };
});

const types: Token[] = TYPE_STYLES.map((s) => ({
  name: `type-${s.name}`,
  kind: 'type',
  copy: `.type-${s.name}`,
  values: [{ value: typeMetrics(s) }, ...(s.letterSpacing ? [{ value: s.letterSpacing }] : [])],
  usage: s.usage,
}));

const scalar = (kind: Kind, list: { name: string; value: Themed; usage: string }[]): Token[] =>
  list.map((t) => ({
    name: t.name,
    kind,
    copy: cssVar(t.name),
    values: themed(t.value),
    usage: t.usage,
  }));

export const TOKENS: Token[] = [
  ...scalar('colour', data.color.tokens),
  ...fonts,
  ...types,
  ...scalar('spacing', data.spacing.tokens),
  ...scalar('radius', data.radius.tokens),
  ...scalar('size', data.size.tokens),
  ...scalar('shadow', data.shadow.tokens),
  ...scalar('motion', data.motion.tokens),
];

export const countOf = (kind: Kind): number => TOKENS.filter((t) => t.kind === kind).length;

/** rgba(200,90,82,0.75) as it's easier to read: rgba(200, 90, 82, 0.75). */
export const readable = (value: string): string => value.replace(/,\s*/g, ', ');

/** A px value as a number: "44px" → 44. */
export const px = (value: string): number => Number.parseFloat(value);
