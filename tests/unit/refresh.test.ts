import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import worker from '../../src/worker/index';
import { REFRESH_CRON, refreshSite } from '../../src/worker/refresh';
import { RETENTION_CRON } from '../../src/worker/retention';

describe('the Cron Triggers', () => {
  it('are the two schedules in wrangler.jsonc', () => {
    const jsonc = readFileSync(new URL('../../wrangler.jsonc', import.meta.url), 'utf8');
    const crons = JSON.parse(jsonc.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1'))
      .triggers.crons;
    expect(crons).toEqual([RETENTION_CRON, REFRESH_CRON]);
  });

  it('each run only its own job', async () => {
    const pruned = vi.fn(async () => ({}));
    const db = { prepare: () => ({ bind: () => ({ run: pruned }) }) };
    const hook = vi.fn(async () => Response.json({ result: { build_uuid: 'b1' } }));
    vi.stubGlobal('fetch', hook);
    const waits: Promise<unknown>[] = [];
    const ctx = { waitUntil: (p: Promise<unknown>) => void waits.push(p) };
    const env = {
      CONSENT_DB: db,
      DEPLOY_HOOK_URL: 'https://hook.example/x',
      ASSETS: { fetch: async () => new Response() },
    } as never;

    await worker.scheduled({ cron: REFRESH_CRON }, env, ctx);
    await Promise.all(waits);
    expect(hook).toHaveBeenCalledOnce();
    expect(pruned).not.toHaveBeenCalled();

    await worker.scheduled({ cron: RETENTION_CRON }, env, ctx);
    await Promise.all(waits);
    expect(pruned).toHaveBeenCalledTimes(2);
    expect(hook).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('skip the rebuild without a Deploy Hook (previews, local development)', async () => {
    const hook = vi.fn();
    vi.stubGlobal('fetch', hook);
    await worker.scheduled({ cron: REFRESH_CRON }, {} as never, { waitUntil: () => {} });
    expect(hook).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('a rebuild', () => {
  it('POSTs to the hook and logs the build', async () => {
    const request = vi.fn(async () => Response.json({ result: { build_uuid: 'b2' } }));
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await refreshSite('https://hook.example/x', request);
    expect(request).toHaveBeenCalledWith('https://hook.example/x', { method: 'POST' });
    expect(log).toHaveBeenCalledWith('[refresh] build b2');
    log.mockRestore();
  });

  it('logs an error when the hook refuses', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await refreshSite('https://hook.example/x', async () => new Response(null, { status: 404 }));
    expect(error).toHaveBeenCalledWith('[refresh] the Deploy Hook answered 404');
    error.mockRestore();
  });
});
