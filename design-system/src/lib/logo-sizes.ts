// Every size the site draws the logo mark at, found in its code at build time: each <Logo size={…}> in
// src/, and the compact nav, which shrinks the nav's mark in CSS. So a new size, or a change to one,
// shows on the logo page without anyone retyping it.
import { markWeight } from '../../../src/lib/logo';
import { place, SOURCES } from './site-source';

export interface LogoSize {
  size: number;
  stroke: number;
  dot: number;
  /** Where it's drawn: "footer", "compact nav". */
  where: string;
}

export function logoSizes(): LogoSize[] {
  const found: { size: number; where: string }[] = [];
  for (const [file, source] of Object.entries(SOURCES)) {
    if (file === 'src/components/Logo.astro') continue;
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
