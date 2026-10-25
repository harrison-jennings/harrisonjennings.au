// @ts-check
import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';
import { csp } from '../src/lib/csp-build.ts';
import { markdown } from '../src/lib/markdown/config.ts';
import { designSystemCsp } from './src/lib/csp.ts';
import { sharedPublic } from './src/lib/shared-public.ts';

// design.harrisonjennings.au: static, like the site, and built from the site's own components, styles,
// tokens and Markdown pipeline (imported from ../src, never copied). See docs/design-system.md.
export default defineConfig({
  site: 'https://design.harrisonjennings.au',
  output: 'static',
  trailingSlash: 'always',
  // csp() last: it reads the finished pages and writes the Content-Security-Policy into dist/_headers.
  integrations: [
    mdx(),
    sharedPublic(['fonts', 'brand', 'favicon.svg', 'favicon.ico', 'icon-192.png', 'icon-512.png']),
    csp(designSystemCsp),
  ],
  build: {
    format: 'directory',
  },
  image: {
    layout: 'constrained',
    responsiveStyles: false,
  },
  // As on the site: component scripts ship as files, so the CSP needs hashes for inline head scripts only.
  vite: {
    build: {
      assetsInlineLimit: (file) => (file.endsWith('.js') ? false : undefined),
    },
  },
  markdown,
});
