// The site's own components, layouts and pages, as text, gathered by Vite from the source at build
// time: what the design system reads to say where a component is used (usedIn) and what sizes the
// logo is drawn at (logo-sizes.ts), rather than anyone retyping it.
import { dirname, join, normalize } from 'node:path/posix';

const RAW = import.meta.glob<string>('../../../src/**/*.astro', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Each file's source, by its path in the repository: src/components/Button.astro. */
export const SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(RAW).map(([file, text]) => [file.replace(/^(\.\.\/)+/, ''), text]),
);

/** Where a file sits, in the site's words: "footer", "author panel", "post", "every page". */
export function place(file: string): string {
  const pages: Record<string, string> = {
    'src/pages/index.astro': 'home',
    'src/pages/404.astro': '404',
    'src/pages/[page].astro': 'legal pages',
    'src/pages/blog/[slug]/index.astro': 'post',
    'src/layouts/Base.astro': 'every page',
  };
  if (pages[file]) return pages[file];
  const parts = file.split('/');
  const name = parts.pop()?.replace(/\.astro$/, '') ?? file;
  // A page's index.astro is named by its folder: src/pages/rss/index.astro → "rss".
  const base = name === 'index' || name.startsWith('[') ? (parts.pop() ?? name) : name;
  return base
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[[\]]/g, '')
    .toLowerCase();
}

/** The files that import `component` (src/components/Button.astro), named by place() or `names`. */
export function usedIn(component: string, names: Record<string, string> = {}): string[] {
  const found = new Set<string>();
  for (const [file, text] of Object.entries(SOURCES)) {
    for (const m of text.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
      if (normalize(join(dirname(file), m[1] ?? '')) === component)
        found.add(names[file] ?? place(file));
    }
  }
  return [...found];
}
