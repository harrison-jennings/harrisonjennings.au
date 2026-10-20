// POST /api/csp-report: Content-Security-Policy violation reports, from both report-uri and report-to
// (src/lib/csp.ts). Each distinct violation is one row in csp_report with a running count.
import { parseCspReports } from '../lib/csp';
import { readBody } from './body';
import { PRODUCTION_HOST, type ConsentEnv } from './consent';

/** Room for a Reporting API batch: each report repeats the whole policy. */
const MAX_BYTES = 64 * 1024;

const text = (body: string, status: number, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain', ...headers } });

export async function handleCspReport(request: Request, env: ConsentEnv): Promise<Response> {
  if (request.method !== 'POST') return text('Method not allowed', 405, { Allow: 'POST' });
  if (!env.CONSENT_DB) return text('Report log unavailable', 503);
  const type = request.headers.get('Content-Type') ?? '';
  if (!/^application\/(csp-report|reports\+json|json)\b/.test(type))
    return text('Unsupported media type', 415);
  const body = await readBody(request, MAX_BYTES);
  if (body === null) return text('Too large', 413);

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return text('Bad request', 400);
  }
  const url = new URL(request.url);
  // Some older browsers send report-uri reports as application/json.
  const format =
    type.startsWith('application/json') && !Array.isArray(parsed) ? 'application/csp-report' : type;
  const violations = parseCspReports(parsed, format, url.host);
  if (!violations.length) return text('Bad request', 400);

  const environment = url.hostname === PRODUCTION_HOST ? 'production' : 'preview';
  for (const v of violations) {
    await env.CONSENT_DB.prepare(
      `INSERT INTO csp_report (directive, blocked, page, source, environment, sample)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (directive, blocked, page, source, environment) DO UPDATE SET
         count = count + 1, sample = excluded.sample,
         last_seen = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    )
      .bind(v.directive, v.blocked, v.page, v.source, environment, v.sample)
      .run();
  }
  return new Response(null, { status: 204 });
}
