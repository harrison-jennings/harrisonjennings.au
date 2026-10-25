// tokens.json, as the design system's download: design/tokens.json itself, the brand's one source.
import type { APIRoute } from 'astro';
import json from '../../../design/tokens.json?raw';

export const GET: APIRoute = () =>
  new Response(json, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
