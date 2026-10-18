// Builds src/styles/tokens.css from design/tokens.json, the single source of truth for the brand.
// Run with `npm run tokens`; `dev`, `build` and `check` run it first.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const fail = (msg) => {
  throw new Error(`design/tokens.json: ${msg}`);
};

/** Turns the parsed contents of design/tokens.json into the CSS for src/styles/tokens.css. */
export function buildTokensCss(tokens) {
  const themes = tokens.color.themes.map((t) => t.id);
  const [primary, ...others] = themes;

  const valueFor = (token, theme) => {
    const v = token.value;
    if (typeof v === 'string') return v;
    return v[theme] ?? v[primary];
  };

  const themed = [...tokens.color.tokens, ...(tokens.shadow?.tokens ?? [])];
  const seen = new Set();
  for (const t of themed) {
    if (!NAME.test(t.name)) fail(`bad token name "${t.name}"`);
    if (seen.has(t.name)) fail(`duplicate token "${t.name}"`);
    seen.add(t.name);
  }

  const block = (selector, theme, indent = '') => {
    const lines = themed.map((t) => `${indent}  --${t.name}: ${valueFor(t, theme)};`);
    return `${indent}${selector} {\n${lines.join('\n')}\n${indent}}`;
  };

  const scalar = ['spacing', 'radius', 'size']
    .flatMap((family) => tokens[family]?.tokens ?? [])
    .map((t) => `  --${t.name}: ${t.value};`);
  const families = Object.entries(tokens.type.families).map(([k, v]) => `  --font-${k}: ${v};`);

  const typeClasses = tokens.type.groups.flatMap((group) =>
    group.styles.map((s) => {
      const decl = [
        `font-family: var(--font-${s.family ?? group.family});`,
        `font-size: ${s.fontSize};`,
        s.lineHeight !== undefined && `line-height: ${s.lineHeight};`,
        s.fontWeight !== undefined && `font-weight: ${s.fontWeight};`,
        s.letterSpacing !== undefined && `letter-spacing: ${s.letterSpacing};`,
      ].filter(Boolean);
      return `.type-${s.name} {\n  ${decl.join('\n  ')}\n}`;
    }),
  );

  const faces = tokens.type.fonts.map((f) => {
    const file = f.file.replace(/^fonts\//, '').replace(/\.(woff2?|ttf|otf)$/, '.woff2');
    return [
      '@font-face {',
      `  font-family: '${f.family}';`,
      `  src: url('/fonts/${file}') format('woff2');`,
      `  font-weight: ${f.weight};`,
      `  font-style: ${f.style ?? 'normal'};`,
      '  font-display: swap;',
      '}',
    ].join('\n');
  });

  const css = [
    `/* ${tokens.name}: generated from design/tokens.json by scripts/build-tokens.mjs. Do not edit. */`,
    '',
    ...faces,
    '',
    `/* ${primary} is the default theme */`,
    block(`:root, [data-theme='${primary}']`, primary),
    '',
    ...others.flatMap((theme) => [
      `/* ${theme}: follows the system setting unless a theme is set explicitly */`,
      `@media (prefers-color-scheme: ${theme}) {`,
      block(`:root:not([data-theme])`, theme, '  '),
      '}',
      block(`[data-theme='${theme}']`, theme),
      '',
    ]),
    `:root {\n${[...scalar, ...families].join('\n')}\n}`,
    '',
    ...typeClasses,
    '',
  ].join('\n');

  return { css, themed: themed.length, scalar: scalar.length };
}

if (import.meta.main) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const source = resolve(root, 'design/tokens.json');
  const target = resolve(root, 'src/styles/tokens.css');

  const { css, themed, scalar } = buildTokensCss(JSON.parse(await readFile(source, 'utf8')));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, css);
  console.log(
    `tokens: wrote ${themed} themed and ${scalar} scalar tokens to src/styles/tokens.css`,
  );
}
