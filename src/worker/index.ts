// The site's only Worker code. It runs for /api/* alone (run_worker_first in wrangler.jsonc); every page
// and asset is served as a static file without it. Two Cron Triggers: once a day it deletes records past
// their retention period (src/worker/retention.ts), and twice a day it asks for a fresh build, for
// the contributions graph (src/worker/refresh.ts). Each runs on its own, so one failing can't stop the
// other.
import { handleConsent, type ConsentEnv } from './consent';
import { handleCspReport } from './csp-report';
import { handleInternalTraffic } from './internal-traffic';
import { REFRESH_CRON, refreshSite } from './refresh';
import { pruneRecords, RETENTION_CRON } from './retention';

interface Env extends ConsentEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
  /** The Workers Builds Deploy Hook for main (a secret; production only). */
  DEPLOY_HOOK_URL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/consent') return handleConsent(request, env);
    if (pathname === '/api/csp-report') return handleCspReport(request, env);
    if (pathname === '/api/internal-traffic') return handleInternalTraffic(request);
    // Anything else under /api/ is the 404 page, as for any unknown path.
    return env.ASSETS.fetch(request);
  },

  async scheduled(
    controller: { cron: string },
    env: Env,
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ): Promise<void> {
    if (controller.cron === RETENTION_CRON && env.CONSENT_DB) {
      ctx.waitUntil(pruneRecords(env.CONSENT_DB));
    }
    if (controller.cron === REFRESH_CRON && env.DEPLOY_HOOK_URL) {
      ctx.waitUntil(refreshSite(env.DEPLOY_HOOK_URL));
    }
  },
};
