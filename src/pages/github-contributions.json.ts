// The calendar this build used (src/lib/contributions.ts), published so the next build can fall back on
// it when GitHub doesn't answer, and so the CD smoke test can see how old it is. `null` when there was
// none, which the next build ignores.
import type { APIRoute } from 'astro';
import { getContributions } from '../lib/contributions';

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await getContributions()), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
