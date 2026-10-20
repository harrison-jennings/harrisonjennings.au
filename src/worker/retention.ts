// The daily clean-up (a Cron Trigger in wrangler.jsonc): consent records are kept 12 months from when
// they were received, CSP reports 90 days from when they were last seen. The privacy policy states the
// consent period; change both together.
import type { ConsentDb } from './consent';

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
