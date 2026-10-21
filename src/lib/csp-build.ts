// Writes the Content-Security-Policy into dist/_headers after the build, with a hash for each inline
// script the pages actually contain: the theme and consent scripts in the page head, and the Tag
// Manager loader on builds that load it. Component scripts are always files (astro.config.mjs), so
// the list stays this short.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { cspHeaders } from './csp';

/** Cloudflare's limit for one line of _headers, header name included. */
const MAX_LINE = 2000;

/** The text of every inline script that runs (JSON and other data blocks don't). */
export function inlineScripts(html: string): string[] {
  const scripts: string[] = [];
  for (const [, attrs = '', body = ''] of html.matchAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,
  )) {
    if (/\ssrc=/i.test(attrs)) continue;
    const type = attrs.match(/\stype=["']?([^"'\s>]+)/i)?.[1]?.toLowerCase();
    if (type && type !== 'module' && type !== 'text/javascript') continue;
    scripts.push(body);
  }
  return scripts;
}

/** A script's CSP hash source. */
export const scriptHash = (body: string): string =>
  `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;

/** Inline event handlers (onclick="…") would need 'unsafe-hashes'; the site has none, and keeps none. */
export const inlineHandlers = (html: string): string[] =>
  [...html.matchAll(/<[a-z][^>]*\s(on[a-z]+)\s*=/gi)].map((m) => m[1] ?? '');

/** _headers with the CSP added to the `/*` rule. */
export function withCsp(headers: string, hashes: string[]): string {
  const lines = cspHeaders(hashes).map(([name, value]) => `  ${name}: ${value}`);
  for (const line of lines) {
    if (line.length > MAX_LINE)
      throw new Error(
        `CSP: a _headers line is ${line.length} characters (Cloudflare's limit is ${MAX_LINE})`,
      );
  }
  const rule = headers.match(/^\/\*[ \t]*$/m);
  if (!rule || rule.index === undefined) throw new Error('CSP: _headers has no /* rule');
  const at = rule.index + rule[0].length;
  return `${headers.slice(0, at)}\n${lines.join('\n')}${headers.slice(at)}`;
}

async function htmlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.html'))
    .map((e) => join(e.parentPath, e.name));
}

export function csp(): AstroIntegration {
  return {
    name: 'csp',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const hashes = new Set<string>();
        for (const file of await htmlFiles(out)) {
          const html = await readFile(file, 'utf8');
          const handlers = inlineHandlers(html);
          if (handlers.length)
            throw new Error(`CSP: inline event handlers (${handlers.join(', ')}) in ${file}`);
          for (const script of inlineScripts(html)) hashes.add(scriptHash(script));
        }
        const path = join(out, '_headers');
        const sorted = [...hashes].sort();
        await writeFile(path, withCsp(await readFile(path, 'utf8'), sorted));
        logger.info(
          `Content-Security-Policy-Report-Only written, ${sorted.length} inline script hashes`,
        );
      },
    },
  };
}
