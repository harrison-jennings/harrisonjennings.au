// Builds the search index after the build (Pagefind): every page that marks its content with
// data-pagefind-body (the docs pages and the overview), split into sections at its ## headings. The
// index is static files in dist/pagefind/, searched in the browser by scripts/search.ts; nothing runs
// on a server. See docs/design-system.md.
import { readdir, readFile, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { close, createIndex } from 'pagefind';

/**
 * Astro's compressed HTML has no space between tags, and Pagefind runs neighbouring elements' text
 * together ("dark" and "#c85a52" become "dark#c85a52"), in excerpts and in the words it indexes. Its
 * copy of a page gets a space between every pair of tags; the pages served are untouched.
 */
export const spaced = (html: string): string => html.replace(/>\s*</g, '> <');

export function searchIndex(): AstroIntegration {
  return {
    name: 'search',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        try {
          // What a screen reader skips (icons, the token table's previews, a don't card's picture),
          // search skips too.
          const { index, errors } = await createIndex({
            forceLanguage: 'en',
            excludeSelectors: ['[aria-hidden="true"]'],
          });
          if (!index) throw new Error(`search: Pagefind didn't start (${errors.join('; ')})`);
          const files = (await readdir(out, { recursive: true, withFileTypes: true }))
            .filter((e) => e.isFile() && e.name.endsWith('.html'))
            .map((e) => join(e.parentPath, e.name));
          let pages = 0;
          for (const file of files) {
            const html = await readFile(file, 'utf8');
            if (!html.includes('data-pagefind-body')) continue;
            const added = await index.addHTMLFile({
              sourcePath: relative(out, file),
              content: spaced(html),
            });
            if (added.errors.length) throw new Error(`search: ${added.errors.join('; ')}`);
            pages += 1;
          }
          // A page that lost its data-pagefind-body would quietly drop out; none at all is a broken build.
          if (pages === 0) throw new Error('search: no pages to index');
          const bundle = join(out, 'pagefind');
          const written = await index.writeFiles({ outputPath: bundle });
          if (written.errors.length) throw new Error(`search: ${written.errors.join('; ')}`);
          // Pagefind's own ready-made interfaces: search is the design system's own, so they'd only ship unused.
          for (const ui of ['pagefind-ui', 'pagefind-modular-ui', 'pagefind-component-ui'])
            for (const ext of ['js', 'css'])
              await rm(join(bundle, `${ui}.${ext}`), { force: true });
          logger.info(`${pages} pages indexed`);
        } finally {
          await close();
        }
      },
    },
  };
}
