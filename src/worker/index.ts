// The site's only Worker code. It runs for /api/* alone (run_worker_first in wrangler.jsonc); every page
// and asset is served as a static file without it.
import { handleConsent, type ConsentEnv } from './consent';
import { handleCspReport } from './csp-report';

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
};
