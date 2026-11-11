// GET /api/contributions-health: whether the home page's contributions graph is fresh, for the uptime
// monitor. The site rebuilds twice a day (src/worker/refresh.ts), and each build fetches the calendar
// from GitHub; if GitHub stops answering (most likely the build's token), the build keeps the last good
// copy and nothing looks wrong. Those refresh builds get no GitHub check, so the CD smoke test never
// sees them. This reads the calendar the live build published (never GitHub) and answers 503 once it's
// more than three days old, so the monitor emails.

/** How old the calendar may get before it counts as stale: six missed refreshes, and a little. */
export const STALE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

interface AssetsEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const answer = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      // public/_headers only reaches static files, not what the Worker writes
      'X-Robots-Tag': 'noindex',
    },
  });

export async function handleContributionsHealth(
  request: Request,
  env: AssetsEnv,
  now = Date.now(),
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { 'Content-Type': 'text/plain', Allow: 'GET, HEAD' },
    });
  }
  const asset = await env.ASSETS.fetch(
    new Request(new URL('/github-contributions.json', request.url)),
  );
  const data = (asset.ok ? await asset.json().catch(() => null) : null) as {
    fetchedAt?: unknown;
  } | null;
  const fetched = typeof data?.fetchedAt === 'string' ? Date.parse(data.fetchedAt) : Number.NaN;
  if (Number.isNaN(fetched)) {
    return answer(503, { status: 'missing', detail: 'no calendar was published with this build' });
  }
  const ageHours = Math.round((now - fetched) / 3_600_000);
  const fresh = now - fetched < STALE_AFTER_MS;
  return answer(fresh ? 200 : 503, {
    status: fresh ? 'fresh' : 'stale',
    fetchedAt: data!.fetchedAt,
    ageHours,
  });
}
