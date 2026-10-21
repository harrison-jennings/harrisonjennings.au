// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import remarkDirective from 'remark-directive';
import { csp } from './src/lib/csp-build.ts';
import { lastModified } from './src/lib/sitemap.ts';
import { remarkCallouts } from './src/lib/markdown/callouts.ts';
import { remarkCookieSettings } from './src/lib/markdown/cookie-settings.ts';
import { remarkCookieTable } from './src/lib/markdown/cookie-table.ts';
import { remarkTextDirectivesAsText } from './src/lib/markdown/directives.ts';
import {
  codeLangs,
  codeTheme,
  codeTransformer,
  rehypeCodeBlocks,
} from './src/lib/markdown/code.ts';
import { rehypeFigures, remarkNoZoom } from './src/lib/markdown/images.ts';
import { remarkReadingTime } from './src/lib/markdown/reading-time.ts';
import { rehypeHeadingCeiling, rehypeTables } from './src/lib/markdown/structure.ts';

const dates = lastModified();

// Static output only: Cloudflare Workers serves the built files from ./dist as static assets.
// See docs/architecture.md before adding an adapter or server routes.
export default defineConfig({
  site: 'https://www.harrisonjennings.au',
  output: 'static',
  trailingSlash: 'always',
  // csp() last: it reads the finished pages and writes the Content-Security-Policy into dist/_headers.
  integrations: [
    mdx(),
    // Each dated page gets a lastmod (src/lib/sitemap.ts); topic pages without enough posts don't exist.
    sitemap({
      // Pages kept out of search (noindex) stay out of the sitemap too.
      filter: (page) => new URL(page).pathname !== '/rss/',
      serialize(item) {
        const lastmod = dates.get(new URL(item.url).pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
    csp(),
  ],
  build: {
    format: 'directory',
  },
  // Responsive images (Markdown images included): a srcset, so phones load a smaller file and the
  // image viewer loads the largest only when it opens. Styled in src/styles/prose.css.
  image: {
    layout: 'constrained',
    responsiveStyles: false,
  },
  // Component scripts always ship as files, never inlined into the page, so the Content-Security-Policy
  // needs hashes for the page head's own scripts alone (src/lib/csp-build.ts). Stylesheets are unaffected.
  vite: {
    build: {
      assetsInlineLimit: (file) => (file.endsWith('.js') ? false : undefined),
    },
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  // Posts and pages: see src/lib/markdown/ and docs/content.md for what each plugin adds.
  markdown: {
    remarkPlugins: [
      remarkDirective,
      remarkCallouts,
      remarkCookieSettings,
      remarkCookieTable,
      remarkTextDirectivesAsText,
      remarkNoZoom,
      remarkReadingTime,
    ],
    rehypePlugins: [rehypeHeadingCeiling, rehypeTables, rehypeFigures, rehypeCodeBlocks],
    remarkRehype: {
      footnoteLabel: 'Footnotes',
      footnoteLabelProperties: { className: ['visually-hidden'] },
      footnoteBackLabel: 'Back to the text',
    },
    shikiConfig: {
      theme: codeTheme,
      langs: codeLangs,
      transformers: [codeTransformer()],
      wrap: false,
    },
  },
});
