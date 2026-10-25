// tokens.css, as the design system's download: the site's generated file (scripts/build-tokens.mjs),
// served from here so the link never goes stale.
import type { APIRoute } from 'astro';
import css from '../../../src/styles/tokens.css?raw';

export const GET: APIRoute = () =>
  new Response(css, { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
