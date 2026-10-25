// The site's own public files that the design system needs too (the fonts its CSS loads from /fonts/,
// the logo marks, the favicon), taken from the site's public/ rather than copied into the repository
// twice. Served by the dev server, and copied into the build.
import { createReadStream } from 'node:fs';
import { cp, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

const SITE_PUBLIC = new URL('../../../public/', import.meta.url);

const TYPES: Record<string, string> = {
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/** Whether a request path is one of the shared paths (a file, or anything inside a folder). */
export function isShared(path: string, paths: string[]): boolean {
  if (path.split('/').includes('..')) return false;
  return paths.some((p) => path === `/${p}` || path.startsWith(`/${p}/`));
}

export function sharedPublic(paths: string[]): AstroIntegration {
  return {
    name: 'shared-public',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
          if (!isShared(path, paths)) return next();
          const file = fileURLToPath(new URL(`.${path}`, SITE_PUBLIC));
          stat(file)
            .then((s) => {
              if (!s.isFile()) return next();
              res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
              createReadStream(file).pipe(res);
            })
            .catch(() => next());
        });
      },
      'astro:build:done': async ({ dir }) => {
        for (const p of paths)
          await cp(new URL(p, SITE_PUBLIC), new URL(p, dir), { recursive: true });
      },
    },
  };
}
