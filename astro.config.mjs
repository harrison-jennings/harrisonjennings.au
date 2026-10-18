// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// Static output only: Cloudflare Workers serves the built files from ./dist as static assets.
// See docs/architecture.md before adding an adapter or server routes.
export default defineConfig({
  site: 'https://www.harrisonjennings.au',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  build: {
    format: 'directory',
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
});
