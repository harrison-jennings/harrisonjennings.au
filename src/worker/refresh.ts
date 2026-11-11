// Twice a day, a Cron Trigger rebuilds the site through a Workers Builds Deploy Hook, so the home
// page's contributions graph (src/lib/contributions.ts, read from GitHub at build time) stays fresh.
// The hook's URL is the Worker secret DEPLOY_HOOK_URL: anyone holding it can start a build, so it's
// never in the repository. Without it (local development, previews) nothing happens.

/**
 * When the rebuilds run (UTC). In Melbourne: 01:17 and 12:17 during daylight saving, 00:17 and 11:17
 * outside it. The night run is after midnight all year, so it fills in the day just ended; the midday
 * run picks up the morning.
 */
export const REFRESH_CRON = '17 1,14 * * *';

/** Asks Workers Builds for a fresh build of main. */
export async function refreshSite(hook: string, request: typeof fetch = fetch): Promise<void> {
  const res = await request(hook, { method: 'POST' });
  if (!res.ok) {
    console.error(`[refresh] the Deploy Hook answered ${res.status}`);
    return;
  }
  const body = (await res.json().catch(() => null)) as {
    result?: { build_uuid?: string; already_exists?: boolean };
  } | null;
  const build = body?.result?.build_uuid ?? 'unknown';
  console.log(`[refresh] build ${build}${body?.result?.already_exists ? ' (already queued)' : ''}`);
}
