// Every size the site draws the logo mark at, found in its code at build time: each <Logo size={…}> in
// src/, and the compact nav, which shrinks the nav's mark in CSS. So a new size, or a change to one,
// shows on the logo page without anyone retyping it.
import { markWeight } from '../../../src/lib/logo';

// The site's components and pages, as text, gathered by Vite from the source at build time.
const SOURCES = import.meta.glob<string>('../../../src/**/*.astro', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export interface LogoSize {
  size: number;
  stroke: number;
  dot: number;
  /** Where it's drawn: "footer", "compact nav". */
  where: string;
}

/** …/AuthorPanel.astro → "author panel"; …/pages/404.astro → "404". */
const place = (file: string): string =>
  (file.split('/').pop() ?? file)
    .replace(/\.astro$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();

export function logoSizes(): LogoSize[] {
  const found: { size: number; where: string }[] = [];
  for (const [file, source] of Object.entries(SOURCES)) {
    if (file.endsWith('/components/Logo.astro')) continue;
    for (const m of source.matchAll(/<Logo\b[^>]*?\bsize=\{(\d+)\}/g))
      found.push({ size: Number(m[1]), where: place(file) });
    // The compact nav resizes the nav's mark in CSS.
    const compact = source.match(/is-compact\s+:global\(\.mark\)\s*\{\s*width:\s*(\d+)px/);
    if (compact) found.push({ size: Number(compact[1]), where: `compact ${place(file)}` });
  }
  const seen = new Set<string>();
  return found
    .filter(({ size, where }) => {
      const key = `${size} ${where}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.size - a.size)
    .map((s) => ({ ...s, ...markWeight(s.size) }));
}
