<div align="center">

<a href="https://www.harrisonjennings.au/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/mark-on-dark.svg">
    <img src="public/brand/mark-on-light.svg" alt="harrison jennings logo: a lowercase h drawn as one line, ending in a brick-red dot" width="96" height="96">
  </picture>
</a>

# harrison jennings

**the source for [harrisonjennings.au](https://www.harrisonjennings.au/)**<br>
marketing automation, analytics and measurement, creative and media strategy.

[![CI](https://github.com/harrison-jennings/harrisonjennings.au/actions/workflows/ci-orchestrator.yml/badge.svg?branch=main)](https://github.com/harrison-jennings/harrisonjennings.au/actions/workflows/ci-orchestrator.yml)
[![CD](https://github.com/harrison-jennings/harrisonjennings.au/actions/workflows/cd-orchestrator.yml/badge.svg?branch=main)](https://github.com/harrison-jennings/harrisonjennings.au/actions/workflows/cd-orchestrator.yml)
[![Astro 7](https://img.shields.io/badge/astro-7-C85A52?style=flat-square&logo=astro&logoColor=EFEAE6&labelColor=121110)](https://astro.build/)
[![Cloudflare Workers](https://img.shields.io/badge/cloudflare-workers-C85A52?style=flat-square&logo=cloudflare&logoColor=EFEAE6&labelColor=121110)](https://developers.cloudflare.com/workers/static-assets/)
[![Node 24](https://img.shields.io/badge/node-24_LTS-E8A27A?style=flat-square&logo=nodedotjs&logoColor=EFEAE6&labelColor=121110)](https://nodejs.org/)
[![TypeScript strictest](https://img.shields.io/badge/typescript-strictest-E8A27A?style=flat-square&logo=typescript&logoColor=EFEAE6&labelColor=121110)](tsconfig.json)
[![Code: MIT](https://img.shields.io/badge/code-MIT-A39C97?style=flat-square&labelColor=121110)](LICENSE)
[![Writing: CC BY 4.0](https://img.shields.io/badge/writing-CC_BY_4.0-A39C97?style=flat-square&labelColor=121110)](https://creativecommons.org/licenses/by/4.0/)

</div>

---

## what this is

A fast, static personal site: a blog, a projects index and a way to book a call. It's built with [Astro](https://astro.build/), written in Markdown in VS Code, and served from [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/). There's no CMS, no database behind the pages and no client framework; the few interactive touches are small scripts.

## quick start

Built and developed on Node 24 LTS (`nvm use` reads `.nvmrc`); Node 22.22 or newer still works.

```sh
npm ci                           # install exactly what the lockfile says
npx playwright install chromium  # once, for the end-to-end tests
npm run dev                      # http://localhost:4321
npm run verify                   # format, lint, types, unit tests, build and end-to-end tests
npm run lighthouse               # build, then Lighthouse on four pages (needs Chrome)
npm run preview                  # build, then serve dist/ through Wrangler as Cloudflare will
```

| script               | what it does                                                  |
| -------------------- | ------------------------------------------------------------- |
| `npm run dev`        | builds the tokens, then starts the Astro dev server           |
| `npm run build`      | builds the tokens, then the static site into `dist/`          |
| `npm run check`      | type-checks `.astro` and `.ts` files with `astro check`       |
| `npm run lint`       | ESLint, including the Astro plugin                            |
| `npm run format`     | formats everything with Prettier                              |
| `npm run tokens`     | regenerates `src/styles/tokens.css` from `design/tokens.json` |
| `npm run test`       | Vitest unit tests                                             |
| `npm run test:e2e`   | builds, then runs the Playwright tests against `wrangler dev` |
| `npm run verify`     | everything CI checks except Lighthouse, in one go             |
| `npm run lighthouse` | builds, then Lighthouse CI against `dist/` (95+ required)     |

## how it's put together

```text
design/tokens.json        the brand: colours (dark and light), type, spacing, radii
scripts/build-tokens.mjs  turns the tokens into src/styles/tokens.css
src/
  components/             Logo, Nav, Footer, Button, TextLink, IconButton, ProjectRow…
  content/                posts and pages (Markdown), topics and projects (YAML)
  content.config.ts       the schemas every entry must follow
  lib/                    small helpers, such as post URLs
  layouts/Base.astro      the page shell: head, nav, footer
  pages/                  one file per route
  scripts/                the small client behaviours (logo draw, button wipe, nav)
  styles/global.css       base styles; reads only tokens
public/                   fonts, favicons, brand files, _headers, _redirects, robots.txt
tests/
  unit/                   Vitest: post helpers and the tokens build
  e2e/                    Playwright: pages, menu, motion, headers and axe, against the built site
docs/                     architecture, brand, content, deployment and decisions
wrangler.jsonc            Cloudflare Workers configuration
```

More in [docs/architecture.md](docs/architecture.md).

## the brand

Dark first, with one warm accent. The full identity, with live previews of every component, lives in the design system; [docs/brand.md](docs/brand.md) is the working summary.

| role       | dark      | light     |
| ---------- | --------- | --------- |
| ground     | `#121110` | `#F4EFEB` |
| text       | `#EFEAE6` | `#1A1615` |
| accent     | `#C85A52` | `#A8443D` |
| hover fill | `#E8A27A` | `#E8A27A` |

Type: **Martian Mono** for display, **Schibsted Grotesk** for everything else, both self-hosted.

Every colour and size in the code comes from `design/tokens.json`. Change a value there and run `npm run tokens`; don't add hex values to components.

## writing

Posts are Markdown files in `src/content/posts/<slug>/index.md`, with their images beside them, and publish at `/blog/<slug>/`. The frontmatter is checked at build time, so a typo in a date fails the build rather than the page. See [docs/content.md](docs/content.md).

## deployment

Cloudflare Workers Builds deploys `main` to production and every other branch to a private preview URL behind Cloudflare Access. See [docs/deployment.md](docs/deployment.md).

## security

Please report vulnerabilities privately; see [SECURITY.md](SECURITY.md).

## licence

Different parts, different licences; the details are in [LICENSE](LICENSE), and they match the site's [terms of use](https://www.harrisonjennings.au/terms-of-use/).

| part                                                                                           | licence                                                                                                             |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| the code                                                                                       | [MIT](LICENSE)                                                                                                      |
| the writing and original graphics in `src/content/` (posts, diagrams, the site's wording)      | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): reuse it, even commercially, with credit and a link back |
| testimonials, screenshots or logos of other people's products, and employer or client material | not mine to license: they belong to their owners                                                                    |
| the name, logo and brand identity, photos of me, the privacy policy and terms                  | © Harrison Jennings, all rights reserved                                                                            |
| the fonts                                                                                      | [SIL Open Font License](public/fonts/)                                                                              |
