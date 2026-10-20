import { describe, expect, it } from 'vitest';
import type { ConsentDb } from '../../src/worker/consent';
import { pruneRecords, retentionCutoffs } from '../../src/worker/retention';

describe('retention', () => {
  it('keeps consent records 12 months and CSP reports 90 days', () => {
    expect(retentionCutoffs(new Date('2026-10-21T03:17:00.000Z'))).toEqual({
      consent: '2025-10-21T03:17:00.000Z',
      csp: '2026-07-23T03:17:00.000Z',
    });
  });

  it('deletes from each table by its own date, with the cutoff bound, not written into the SQL', async () => {
    const calls: Array<{ sql: string; values: unknown[] }> = [];
    const db: ConsentDb = {
      prepare: (sql) => ({
        bind: (...values) => ({
          run: async () => {
            calls.push({ sql, values });
            return {};
          },
        }),
      }),
    };
    await pruneRecords(db, new Date('2026-10-21T03:17:00.000Z'));
    expect(calls).toEqual([
      { sql: 'DELETE FROM consent_log WHERE created_at < ?', values: ['2025-10-21T03:17:00.000Z'] },
      { sql: 'DELETE FROM csp_report WHERE last_seen < ?', values: ['2026-07-23T03:17:00.000Z'] },
    ]);
  });
});
