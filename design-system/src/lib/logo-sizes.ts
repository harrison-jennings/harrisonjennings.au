// Every size the site shows the logo mark at, found in its code at build time: each <Logo size={…}> in
// src/, and the compact nav, which shrinks the nav's mark in CSS. So a new size, or a change to one,
// shows on the logo page without anyone retyping it. The weight comes from the size the mark is drawn
// at: the compact nav's is the nav's own drawing made smaller, so it keeps the nav's weight.
import { markWeight } from '../../../src/lib/logo';
import { place, SOURCES } from './site-source';

export interface LogoSize {
  /** The size it's shown at. */
  size: number;
  /** The size the component draws it at, which picks its weight: the same, unless CSS resizes it. */
  drawn: number;
  stroke: number;
  dot: number;
  /** Where it's drawn: "footer", "compact nav". */
  where: string;
}

export function logoSizes(): LogoSize[] {
  const found: { size: number; drawn: number; where: string }[] = [];
  for (const [file, source] of Object.entries(SOURCES)) {
    if (file === 'src/components/Logo.astro') continue;
    const drawn = [...source.matchAll(/<Logo\b[^>]*?\bsize=\{(\d+)\}/g)].map((m) => Number(m[1]));
    for (const size of drawn) found.push({ size, drawn: size, where: place(file) });
    // The compact nav resizes the nav's mark in CSS: the same drawing, smaller.
    const compact = source.match(/is-compact\s+:global\(\.mark\)\s*\{\s*width:\s*(\d+)px/);
    if (compact && drawn[0])
      found.push({ size: Number(compact[1]), drawn: drawn[0], where: `compact ${place(file)}` });
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
    .map((s) => ({ ...s, ...markWeight(s.drawn) }));
}
