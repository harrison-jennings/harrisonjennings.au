// The design system's Content-Security-Policy. Unlike the site's (src/lib/csp.ts) it's enforced from
// the start and reports nowhere: there's no third-party code to allow, and a refused script shows up
// in the end-to-end tests. Pages may frame only each other (the previews), and nothing else may
// frame them. Cloudflare Web Analytics' beacon is allowed in case the zone adds it. Search runs
// Pagefind's WebAssembly, which needs 'wasm-unsafe-eval' (WebAssembly only, not JavaScript's eval).

const SOURCES: Record<string, string[]> = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'wasm-unsafe-eval'", 'https://static.cloudflareinsights.com'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'frame-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
};

export function designSystemCsp(hashes: string[]): Array<[name: string, value: string]> {
  const policy = Object.entries(SOURCES)
    .map(([name, sources]) =>
      [name, ...sources, ...(name === 'script-src' ? hashes : [])].join(' '),
    )
    .join('; ');
  return [['Content-Security-Policy', policy]];
}
