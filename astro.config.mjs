// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import remarkDirective from 'remark-directive';
import { remarkCallouts } from './src/lib/markdown/callouts.ts';
import {
  codeLangs,
  codeTheme,
  codeTransformer,
  rehypeCodeBlocks,
} from './src/lib/markdown/code.ts';
import { rehypeFigures, remarkNoZoom } from './src/lib/markdown/images.ts';
import { remarkReadingTime } from './src/lib/markdown/reading-time.ts';
import { rehypeHeadingCeiling, rehypeTables } from './src/lib/markdown/structure.ts';

// Static output only: Cloudflare Workers serves the built files from ./dist as static assets.
// See docs/architecture.md before adding an adapter or server routes.
export default defineConfig({
  site: 'https://www.harrisonjennings.au',
  output: 'static',
  trailingSlash: 'always',
  integrations: [mdx(), sitemap()],
  build: {
    format: 'directory',
  },
  // Responsive images (Markdown images included): a srcset, so phones load a smaller file and the
  // image viewer loads the largest only when it opens. Styled in src/styles/prose.css.
  image: {
    layout: 'constrained',
    responsiveStyles: false,
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  // Posts: see src/lib/markdown/ and docs/content.md for what each plugin adds.
  markdown: {
    remarkPlugins: [remarkDirective, remarkCallouts, remarkNoZoom, remarkReadingTime],
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
