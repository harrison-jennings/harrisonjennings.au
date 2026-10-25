# Design system

`design.harrisonjennings.au`: the reference for the brand, every component, every token and every kind of content a post can hold, built from the site's own code so it can't drift from it. Public, never indexed. The plan and the decision are in `docs/decisions.md`; the pages are built from the approved mockups (the brief is in the private notes repo).

## How it's built

A second Astro site in `design-system/`, an npm workspace of this repository, deployed as its own Worker (`harrisonjennings-au-design`). It imports from the main site and never copies:

- **Components, styles and tokens** from `src/components/`, `src/styles/` (including the generated `tokens.css`) and `src/lib/`.
- **The Markdown pipeline** from `src/lib/markdown/config.ts`, the same module `astro.config.mjs` uses, so a content example renders exactly as it would in a post.
- **Public files** the site's CSS and pages need (`public/fonts/`, `public/brand/`, `public/favicon.svg`): served by the dev server and copied into the build by `design-system/src/lib/shared-public.ts`.

**Pages and the shell.** Each page is an MDX file in `design-system/src/content/docs/<section>/<page>.mdx`, published at `/<section>/<page>/`, so its wording can be edited without touching code. Its frontmatter gives the `title`, the `lead`, its `group` and `order` within the section, and an optional `facts` line (label, value, link). The six sections and their groups are the one fixed list (`src/lib/sections.ts`); everything else is built from the pages that exist (`src/lib/nav.ts`): the header's section links, the sidebar's groups and counts, the phone menu, the page picker and the breadcrumb. A new page appears in its group by itself, and a section or group shows once it has a page. `/<section>/` on its own redirects to the section's first page. The overview at `/` is a landing page with no sidebar.

The shell (`layouts/Shell.astro`, `styles/shell.css`, `scripts/shell.ts`) follows the design hand-off's Shell and Sidebar notes: the brick line across the top and "design system" beside the logo on every page; a sidebar whose groups open and close (the current page's group starts open, and what's opened is remembered for the visit in `sessionStorage`); "on this page" from the page's `##` headings, marking the one being read (the site's own `src/scripts/toc.ts`); and on phones a page picker and a full-screen menu dialog with the same groups. Without JavaScript every group shows. The theme toggle and the head script that applies the saved theme are the site's own (`src/components/ThemeToggle.astro`, `src/components/ThemeHead.astro`); the design system is another origin, so it remembers its choice separately. Links that leave the design system, to harrisonjennings.au included, open in a new tab (`src/lib/links.ts`). Search has a slot in the header and the menu but no button until search exists.

**Specimens and previews.** Every example is a specimen page (`design-system/src/pages/specimens/`), the example on its own with the site's real CSS (`layouts/Specimen.astro`). A preview (`components/Preview.astro`) shows it in iframes at a true width (phone 390, desktop 1280), in the theme it asks for (`?theme=light`), scaled down to fit the column when needed. Iframes, because the site's layout responds to the screen's width, not a container's: a phone preview has to be a phone-width screen. The specimen reports its height to the preview (`scripts/specimen.ts`, `scripts/preview.ts`).

**Code to copy** comes from the example itself, never a second copy: a component example's own file (`?raw`, minus its frontmatter), a content example's Markdown file.

**Headers** (`design-system/public/_headers`): `X-Robots-Tag: noindex, nofollow` on every response (robots.txt doesn't block crawling, or crawlers couldn't read it), `X-Frame-Options: SAMEORIGIN`, and an enforced Content-Security-Policy (`design-system/src/lib/csp.ts`, written by the same build step as the site's) that lets pages frame only each other.

**Build stamp:** the footer names the commit it was built from (`WORKERS_CI_COMMIT_SHA` on Workers Builds, git elsewhere) and the date.

## Working on it

```sh
npm run design:dev       # http://localhost:4322
npm run design:build     # design-system/dist
npm run design:preview   # build, then serve through Wrangler on :8791, as Cloudflare will
```

To add a page, add its MDX file with that frontmatter; to add a group or section, add it to `src/lib/sections.ts`. `npm run check` type-checks both sites; `npm run test:e2e` builds both and runs the `design-system` Playwright project (`tests/e2e/design-system/`) beside the site's tests. In CI it runs in the Chromium job.

## Deploying

Workers Builds, from the Worker `harrisonjennings-au-design` connected to this repository:

| Setting           | Value                                                                                                                                                                                                                                                  | Why                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root directory    | `design-system`                                                                                                                                                                                                                                        | Cloudflare checks the Worker's name against the Wrangler config in the root directory; at the repository root it would read the site's `wrangler.jsonc` and offer to rename it |
| Build command     | `npm run build:cloudflare`                                                                                                                                                                                                                             | Installs from the repository root (Cloudflare's own install step runs in `design-system/` and installs only the workspace), then builds                                        |
| Deploy command    | `npm run deploy`                                                                                                                                                                                                                                       | `wrangler deploy`                                                                                                                                                              |
| Preview command   | `npm run preview`                                                                                                                                                                                                                                      | `wrangler preview`, for every other branch                                                                                                                                     |
| Build watch paths | include `design-system/*`, `src/components/*`, `src/styles/*`, `src/scripts/*`, `src/lib/*`, `design/*`, `public/fonts/*`, `public/brand/*`, `public/favicon.svg`, `frontmatter.json`, `package.json`, `package-lock.json`, `scripts/build-tokens.mjs` | Builds only when something it shows could have changed                                                                                                                         |

`design-system/package.json` pins npm (`packageManager`) and `design-system/.nvmrc` links to the site's Node version, because Cloudflare reads both from the root directory. The custom domain `design.harrisonjennings.au` is set on the Worker in the dashboard, like the site's route, so `wrangler deploy` leaves it alone. Previews are behind Cloudflare Access, as the site's are.

The site's own Worker still builds on every push. The CD Orchestrator relies on that: once the site's build of a commit has finished, the design system either has a "Workers Builds: harrisonjennings-au-design" check on it or wasn't built (`scripts/cloudflare-built.sh`).

**After each deploy** the 🚀 CD Orchestrator records it, as it does for the site, but only for commits Cloudflare built the design system for:

- **On a pull request** (`.github/workflows/design-system-preview.yml`): waits for the preview build and records a **Design system preview** deployment with the branch's Preview URL.
- **On main** (`.github/workflows/design-system-production.yml`): waits for the deploy, smoke-tests that exact version through its preview address (`scripts/design-smoke-test.sh`, with the Access service token), checks the live domain (`scripts/design-live-check.sh`; Bot Fight Mode challenges GitHub's runners, so a challenge is noted rather than failed), and records a **Design system** deployment.

The scripts take the Worker's name in `WORKER` (`wait-for-cloudflare.sh`, `version-url.sh`, `preview-url.sh`), because each Worker posts its own check on a commit.
