import { describe, expect, it, vi } from 'vitest';
import type { ConsentDb } from '../../src/worker/consent';
import { pruneRecords, retentionCutoffs, runRetention } from '../../src/worker/retention';

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

describe('the heartbeat', () => {
  const db = (fail = false): ConsentDb => ({
    prepare: () => ({
      bind: () => ({
        run: async () => {
          if (fail) throw new Error('D1 is down');
          return {};
        },
      }),
    }),
  });
  const hook = 'https://uptime.betterstack.com/api/v1/heartbeat/abc';

  it('is sent after a clean-up that worked', async () => {
    const request = vi.fn(async () => new Response('OK'));
    await runRetention(db(), hook, request);
    expect(request).toHaveBeenCalledExactlyOnceWith(hook, { method: 'POST' });
  });

  it('reports /fail when the clean-up fails, and still throws', async () => {
    const request = vi.fn(async () => new Response('OK'));
    await expect(runRetention(db(true), hook, request)).rejects.toThrow('D1 is down');
    expect(request).toHaveBeenCalledExactlyOnceWith(`${hook}/fail`, { method: 'POST' });
  });

  it("never hides the clean-up's result when the heartbeat can't be reached", async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const request = vi.fn(async () => {
      throw new Error('offline');
    });
    await expect(runRetention(db(), hook, request)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      "[retention] the heartbeat couldn't be reached: Error: offline",
    );
    error.mockRestore();
  });

  it('is skipped without a heartbeat URL (previews, local development)', async () => {
    const request = vi.fn();
    await runRetention(db(), undefined, request);
    expect(request).not.toHaveBeenCalled();
  });
});
