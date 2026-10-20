// The site's only Worker code. It runs for /api/* alone (run_worker_first in wrangler.jsonc); every page
// and asset is served as a static file without it. Once a day, a Cron Trigger deletes records past their
// retention period (src/worker/retention.ts).
import { handleConsent, type ConsentEnv } from './consent';
import { handleCspReport } from './csp-report';
import { pruneRecords } from './retention';

interface Env extends ConsentEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/consent') return handleConsent(request, env);
    if (pathname === '/api/csp-report') return handleCspReport(request, env);
    // Anything else under /api/ is the 404 page, as for any unknown path.
    return env.ASSETS.fetch(request);
  },

  async scheduled(
    _controller: unknown,
    env: Env,
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ): Promise<void> {
    if (env.CONSENT_DB) ctx.waitUntil(pruneRecords(env.CONSENT_DB));
  },
};
