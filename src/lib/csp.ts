// The Content-Security-Policy: every place the site's pages may load from, and what's done with a
// report of something outside it. The build adds the inline scripts' hashes and writes the header into
// dist/_headers (src/lib/csp-build.ts); the Worker stores reports (src/worker/csp-report.ts).
//
// It's sent as Content-Security-Policy-Report-Only until the reports are clean after cutover: nothing
// is blocked, every violation is reported. See docs/decisions.md.

/** Where browsers send violation reports. */
export const REPORT_PATH = '/api/csp-report';

/** The measurement subdomain: Tag Manager's loader and the server container's collection. */
const MEASURE = 'https://measure.harrisonjennings.au';

// Google's own lists (developers.google.com/tag-platform/security/guides/csp): Tag Manager, GA4
// without Ads features, and Tag Manager's preview mode (Tag Assistant).
const GOOGLE_TAG = 'https://www.googletagmanager.com';
const PREVIEW = 'https://tagmanager.google.com';

/** Every directive's sources, besides the inline script hashes the build adds to script-src. */
export const CSP_SOURCES: Record<string, string[]> = {
  'default-src': ["'self'"],
  // Cal.com's embed is loaded only when someone opens the calendar (src/scripts/booking.ts).
  'script-src': ["'self'", MEASURE, GOOGLE_TAG, PREVIEW, 'https://app.cal.com'],
  // Inline styles: Astro's small stylesheets and style attributes, Cal.com's embed, Tag Assistant.
  'style-src': ["'self'", "'unsafe-inline'", GOOGLE_TAG, PREVIEW, 'https://fonts.googleapis.com'],
  'img-src': [
    "'self'",
    'data:',
    MEASURE,
    GOOGLE_TAG,
    'https://*.google-analytics.com',
    'https://ssl.gstatic.com',
    'https://www.gstatic.com',
  ],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
  'connect-src': [
    "'self'",
    MEASURE,
    GOOGLE_TAG,
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://www.google.com',
    'https://app.cal.com',
  ],
  // The calendar, a post's video once played (src/scripts/video.ts), and Tag Manager's frames: the
  // server container's service worker frame comes from the measurement subdomain.
  'frame-src': [
    MEASURE,
    'https://cal.com',
    'https://app.cal.com',
    'https://www.youtube-nocookie.com',
    GOOGLE_TAG,
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
};

/** The policy, with the inline scripts' hashes ('sha256-…') allowed alongside script-src. */
export function cspPolicy(hashes: string[]): string {
  const directives = Object.entries(CSP_SOURCES).map(([name, sources]) =>
    [name, ...sources, ...(name === 'script-src' ? hashes : [])].join(' '),
  );
  // report-uri for Firefox and Safari; report-to (the Reporting API) for Chromium, which then
  // ignores report-uri.
  return [...directives, `report-uri ${REPORT_PATH}`, 'report-to csp'].join('; ');
}

/** The response headers for every page. */
export function cspHeaders(hashes: string[]): Array<[name: string, value: string]> {
  return [
    ['Content-Security-Policy-Report-Only', cspPolicy(hashes)],
    ['Reporting-Endpoints', `csp="${REPORT_PATH}"`],
  ];
}

/** One violation, reduced to what's needed to fix the policy. */
export interface CspViolation {
  /** The directive that was broken, such as script-src-elem. */
  directive: string;
  /** What was refused: an origin and path (no query string), or a keyword such as inline or eval. */
  blocked: string;
  /** The page, as a path only. */
  page: string;
  /** The script that caused it, as an origin and path, with its line (empty when there isn't one). */
  source: string;
  /** The first characters of an inline script or eval, when the browser includes them. */
  sample: string;
}

const MAX_FIELD = 200;
/** A Reporting API delivery can batch several reports; more than this in one is not a browser. */
const MAX_REPORTS = 20;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const clip = (value: unknown): string => text(value).slice(0, MAX_FIELD);

/** A URL as origin and path, dropping the query string (it can carry identifiers). */
function withoutQuery(value: string): string {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? clip(url.origin + url.pathname)
      : clip(url.protocol.replace(':', ''));
  } catch {
    // inline, eval, wasm-eval, trusted-types-sink and the like.
    return clip(value);
  }
}

type Fields = Record<string, unknown>;

/** A report body from either format, in the Reporting API's field names. */
function normalise(body: Fields, legacy: boolean): Fields {
  if (!legacy) return body;
  return {
    documentURL: body['document-uri'],
    blockedURL: body['blocked-uri'],
    effectiveDirective: body['effective-directive'] ?? body['violated-directive'],
    sourceFile: body['source-file'],
    lineNumber: body['line-number'],
    sample: body['script-sample'],
  };
}

function violation(raw: Fields, legacy: boolean, host: string): CspViolation | null {
  const body = normalise(raw, legacy);
  let page: URL;
  try {
    page = new URL(text(body['documentURL']));
  } catch {
    return null;
  }
  // Reports about this site's own pages only.
  if (page.host !== host) return null;
  const directive = clip(body['effectiveDirective']).split(' ')[0] ?? '';
  if (!/^[a-z-]+$/.test(directive)) return null;
  const file = body['sourceFile'] ? withoutQuery(text(body['sourceFile'])) : '';
  const line = Number(body['lineNumber']);
  return {
    directive,
    blocked: withoutQuery(text(body['blockedURL'])) || 'unknown',
    page: clip(page.pathname),
    source: file && Number.isInteger(line) && line > 0 ? `${file}:${line}` : file,
    sample: clip(body['sample']).slice(0, 80),
  };
}

/**
 * The violations in a report request, from either format browsers use: `application/csp-report`
 * (report-uri: one `{ "csp-report": {…} }`) or `application/reports+json` (report-to: an array of
 * reports, of which only `csp-violation` ones count). Anything else, or about another site, is dropped.
 */
export function parseCspReports(
  payload: unknown,
  contentType: string,
  host: string,
): CspViolation[] {
  if (contentType.startsWith('application/csp-report')) {
    const body = (payload as Fields | null)?.['csp-report'];
    if (!body || typeof body !== 'object') return [];
    const one = violation(body as Fields, true, host);
    return one ? [one] : [];
  }
  if (!Array.isArray(payload)) return [];
  return payload
    .slice(0, MAX_REPORTS)
    .filter(
      (r): r is Fields => !!r && typeof r === 'object' && (r as Fields)['type'] === 'csp-violation',
    )
    .map((r) =>
      r['body'] && typeof r['body'] === 'object'
        ? violation(r['body'] as Fields, false, host)
        : null,
    )
    .filter((v): v is CspViolation => v !== null);
}
