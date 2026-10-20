import { describe, expect, it } from 'vitest';
import { cspHeaders, cspPolicy, parseCspReports } from '../../src/lib/csp';
import { inlineHandlers, inlineScripts, scriptHash, withCsp } from '../../src/lib/csp-build';
import type { ConsentDb } from '../../src/worker/consent';
import { handleCspReport } from '../../src/worker/csp-report';

const HOST = 'www.harrisonjennings.au';

describe('the policy', () => {
  it('adds the inline hashes to script-src, and reports to the endpoint', () => {
    const policy = cspPolicy(["'sha256-abc='"]);
    const directives = policy.split('; ');
    expect(directives.find((d) => d.startsWith('script-src '))).toMatch(/'self'.* 'sha256-abc='$/);
    expect(directives).toContain("object-src 'none'");
    expect(directives).toContain("frame-ancestors 'none'");
    expect(directives.slice(-2)).toEqual(['report-uri /api/csp-report', 'report-to csp']);
  });

  it('never allows inline scripts or eval wholesale', () => {
    const script = cspPolicy([])
      .split('; ')
      .find((d) => d.startsWith('script-src '));
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
  });

  it('is sent as Report-Only, with the Reporting API endpoint', () => {
    expect(cspHeaders([]).map(([name]) => name)).toEqual([
      'Content-Security-Policy-Report-Only',
      'Reporting-Endpoints',
    ]);
  });
});

describe('the build step', () => {
  it('finds the inline scripts that run, not data blocks or files', () => {
    const html = `<script>a()</script><script type="module">b()</script>
      <script type="application/json" data-page-layer>{"x":1}</script>
      <script type="application/ld+json">{}</script><script type="module" src="/_astro/c.js"></script>`;
    expect(inlineScripts(html)).toEqual(['a()', 'b()']);
  });

  it('hashes a script as browsers do (SHA-256 of its exact text, base64)', () => {
    // The CSP specification's own example: alert('Hello, world.');
    expect(scriptHash("alert('Hello, world.');")).toBe(
      "'sha256-qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng='",
    );
  });

  it('spots inline event handlers', () => {
    expect(inlineHandlers('<button onclick="x()">')).toEqual(['onclick']);
    expect(inlineHandlers('<p>click on="this"</p><a data-on="x">')).toEqual([]);
  });

  it('adds the headers to the /* rule and leaves the others alone', () => {
    const headers = '# comment\n/*\n  X-Frame-Options: DENY\n\n/fonts/*\n  Cache-Control: x\n';
    const out = withCsp(headers, ["'sha256-abc='"]);
    expect(out).toMatch(/^# comment\n\/\*\n {2}Content-Security-Policy-Report-Only: default-src/);
    expect(out).toContain(
      '\n  Reporting-Endpoints: csp="/api/csp-report"\n  X-Frame-Options: DENY\n',
    );
    expect(out).toContain('/fonts/*\n  Cache-Control: x\n');
  });

  it("refuses a line longer than Cloudflare's limit", () => {
    const many = Array.from({ length: 30 }, (_, i) => `'sha256-${'x'.repeat(43)}${i}='`);
    expect(() => withCsp('/*\n', many)).toThrow(/limit is 2000/);
  });
});

const legacy = {
  'csp-report': {
    'document-uri': `https://${HOST}/blog/some-post/?utm_source=x`,
    'violated-directive': 'script-src-elem',
    'effective-directive': 'script-src-elem',
    'blocked-uri': 'https://evil.example/x.js?id=123',
    'source-file': `https://${HOST}/_astro/a.js?v=1`,
    'line-number': 12,
    'script-sample': '',
  },
};

const modern = [
  {
    type: 'csp-violation',
    url: `https://${HOST}/`,
    body: {
      documentURL: `https://${HOST}/`,
      blockedURL: 'eval',
      effectiveDirective: 'script-src',
      sourceFile: 'https://measure.harrisonjennings.au/OzAbOvUs9mw4IY9Ch0V/?id=GTM-X',
      lineNumber: 500,
      sample: 'return function(){',
    },
  },
  { type: 'deprecation', body: { documentURL: `https://${HOST}/` } },
];

describe('reading reports', () => {
  it('reads report-uri reports, dropping query strings', () => {
    expect(parseCspReports(legacy, 'application/csp-report', HOST)).toEqual([
      {
        directive: 'script-src-elem',
        blocked: 'https://evil.example/x.js',
        page: '/blog/some-post/',
        source: `https://${HOST}/_astro/a.js:12`,
        sample: '',
      },
    ]);
  });

  it('reads Reporting API batches, keeping only CSP violations', () => {
    expect(parseCspReports(modern, 'application/reports+json', HOST)).toEqual([
      {
        directive: 'script-src',
        blocked: 'eval',
        page: '/',
        source: 'https://measure.harrisonjennings.au/OzAbOvUs9mw4IY9Ch0V/:500',
        sample: 'return function(){',
      },
    ]);
  });

  it("drops reports about another site's pages, and anything malformed", () => {
    expect(parseCspReports(legacy, 'application/csp-report', 'example.com')).toEqual([]);
    expect(parseCspReports({ nope: 1 }, 'application/csp-report', HOST)).toEqual([]);
    expect(parseCspReports({ nope: 1 }, 'application/reports+json', HOST)).toEqual([]);
    expect(parseCspReports([{ type: 'csp-violation' }], 'application/reports+json', HOST)).toEqual(
      [],
    );
  });
});

describe("Cloudflare's own scripts", () => {
  it('allows the Web Analytics beacon and asks for samples of refused inline scripts', () => {
    const script = cspPolicy([])
      .split('; ')
      .find((d) => d.startsWith('script-src '));
    expect(script).toContain('https://static.cloudflareinsights.com');
    expect(script).toContain("'report-sample'");
  });

  it("drops reports of Bot Fight Mode's inline scripts, and keeps other inline ones", () => {
    const report = (sample: string) => [
      {
        type: 'csp-violation',
        body: {
          documentURL: `https://${HOST}/`,
          blockedURL: 'inline',
          effectiveDirective: 'script-src-elem',
          sample,
        },
      },
    ];
    // The loader at the end of the body, then the script it writes into a hidden frame.
    for (const sample of [
      '(function(){function c(){var b=a.content',
      "window.__CF$cv$params={r:'a1b2c3',t:'MTc5",
    ]) {
      expect(parseCspReports(report(sample), 'application/reports+json', HOST)).toEqual([]);
    }
    expect(parseCspReports(report('alert(1)'), 'application/reports+json', HOST)).toHaveLength(1);
  });
});

describe('the report endpoint', () => {
  const db = () => {
    const calls: unknown[][] = [];
    const fake: ConsentDb = {
      prepare: () => ({
        bind: (...values: unknown[]) => ({
          run: async () => {
            calls.push(values);
            return {};
          },
        }),
      }),
    };
    return { calls, fake };
  };

  const post = (body: unknown, type: string, host = HOST, method = 'POST') =>
    new Request(`https://${host}/api/csp-report`, {
      method,
      headers: { 'Content-Type': type },
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
    });

  it('counts each violation, marked production on the live site', async () => {
    const { calls, fake } = db();
    const response = await handleCspReport(post(legacy, 'application/csp-report'), {
      CONSENT_DB: fake,
    });
    expect(response.status).toBe(204);
    expect(calls).toEqual([
      [
        'script-src-elem',
        'https://evil.example/x.js',
        '/blog/some-post/',
        `https://${HOST}/_astro/a.js:12`,
        'production',
        '',
      ],
    ]);
  });

  it('marks reports from previews as preview', async () => {
    const host = 'feat-csp-harrisonjennings-au.harrisonjennings-au.workers.dev';
    const report = [
      { ...modern[0], body: { ...modern[0]!.body, documentURL: `https://${host}/` } },
    ];
    const { calls, fake } = db();
    await handleCspReport(post(report, 'application/reports+json', host), { CONSENT_DB: fake });
    expect(calls[0]?.[4]).toBe('preview');
  });

  it('turns away the wrong method, type, an empty report, or one too large', async () => {
    const { calls, fake } = db();
    const env = { CONSENT_DB: fake };
    expect(
      (await handleCspReport(post(null, 'application/csp-report', HOST, 'GET'), env)).status,
    ).toBe(405);
    expect((await handleCspReport(post(legacy, 'text/plain'), env)).status).toBe(415);
    expect((await handleCspReport(post({}, 'application/csp-report'), env)).status).toBe(400);
    const huge = { 'csp-report': { ...legacy['csp-report'], 'script-sample': 'x'.repeat(70_000) } };
    expect((await handleCspReport(post(huge, 'application/csp-report'), env)).status).toBe(413);
    expect(calls).toHaveLength(0);
  });

  it('answers 503 without a database binding', async () => {
    expect((await handleCspReport(post(legacy, 'application/csp-report'), {})).status).toBe(503);
  });
});
