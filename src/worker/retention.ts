// The daily clean-up (a Cron Trigger in wrangler.jsonc): consent records are kept 12 months from when
// they were received, CSP reports 90 days from when they were last seen. The privacy policy states the
// consent period; change both together. Each run reports to a Better Stack heartbeat (the secret
// RETENTION_HEARTBEAT_URL): a request when it worked, the same URL with /fail when it didn't, and a
// missed day raises an incident on its own, so a clean-up that silently stops is noticed.
import type { ConsentDb } from './consent';

/** When the clean-up runs (UTC): early afternoon in Melbourne. */
export const RETENTION_CRON = '17 3 * * *';

export const CONSENT_KEEP_MONTHS = 12;
export const CSP_KEEP_DAYS = 90;

/** The oldest timestamps kept, in the same ISO 8601 form the tables store. */
export function retentionCutoffs(now: Date): { consent: string; csp: string } {
  const consent = new Date(now);
  consent.setUTCMonth(consent.getUTCMonth() - CONSENT_KEEP_MONTHS);
  const csp = new Date(now.getTime() - CSP_KEEP_DAYS * 24 * 60 * 60 * 1000);
  return { consent: consent.toISOString(), csp: csp.toISOString() };
}

/** Deletes everything older than its retention period. */
export async function pruneRecords(db: ConsentDb, now = new Date()): Promise<void> {
  const cutoff = retentionCutoffs(now);
  await db.prepare('DELETE FROM consent_log WHERE created_at < ?').bind(cutoff.consent).run();
  await db.prepare('DELETE FROM csp_report WHERE last_seen < ?').bind(cutoff.csp).run();
}

/**
 * The clean-up, reported to the heartbeat when there is one. A failed clean-up is still thrown, so it
 * shows as an error in the Worker's logs; a heartbeat that can't be reached is only logged, so it never
 * hides the clean-up's own result.
 */
export async function runRetention(
  db: ConsentDb,
  heartbeat?: string,
  request: typeof fetch = fetch,
  now = new Date(),
): Promise<void> {
  const report = async (url: string) => {
    try {
      const res = await request(url, { method: 'POST' });
      if (!res.ok) console.error(`[retention] the heartbeat answered ${res.status}`);
    } catch (error) {
      console.error(`[retention] the heartbeat couldn't be reached: ${String(error)}`);
    }
  };
  try {
    await pruneRecords(db, now);
  } catch (error) {
    if (heartbeat) await report(`${heartbeat.replace(/\/$/, '')}/fail`);
    throw error;
  }
  if (heartbeat) await report(heartbeat);
}
