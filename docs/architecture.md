# architecture

## the short version

Astro builds every page to static HTML at build time. Cloudflare Workers serves `dist/` as [static assets](https://developers.cloudflare.com/workers/static-assets/). No code runs per request for pages.

```text
Markdown + .astro ──astro build──▶ dist/ ──Workers Builds──▶ Cloudflare edge ──▶ www.harrisonjennings.au
        ▲
design/tokens.json ──scripts/build-tokens.mjs──▶ src/styles/tokens.css
```

## pieces

- **Pages** (`src/pages/`): one file per route. Trailing slashes are always used (`/blog/`), and `wrangler.jsonc` sets `html_handling: auto-trailing-slash` to match, so there are no redirect chains.
- **Content** (`src/content/`): posts and pages in Markdown, topics and projects in YAML. `src/content.config.ts` holds the schemas, so bad frontmatter fails the build. Posts publish at `/blog/<slug>/` and topics at `/blog/topic/<id>/`. See [content.md](content.md).
- **Components** (`src/components/`): each has scoped styles that read tokens only. Behaviours live in `src/scripts/` and are imported by the component that needs them, so Astro bundles them once per page.
- **Tokens** (`design/tokens.json`, a copy of `design/system/tokens.json`): the brand's single source of truth. `npm run tokens` writes `src/styles/tokens.css` (ignored by git, rebuilt before `dev`, `build` and `check`). Dark is on `:root` and `[data-theme="dark"]`; light only under `[data-theme="light"]`.
- **Theme**: dark on every first visit, whatever the device is set to. The nav's sun/moon toggle (`ThemeToggle.astro`, `src/scripts/theme.ts`) switches theme and saves it in `localStorage` (`hj-theme`), a functional setting outside the consent banner. A tiny inline script at the top of `<head>` in `Base.astro` applies the saved theme before first paint, so there's no flash; the Content-Security-Policy will need its hash.
- **Layout**: one column shared with the nav. `.shell` holds the nav pill (`--container` wide, `space-16` gutters); `.column` holds page content, starting under the nav's logo and ending under its button. Breakpoint 760px. On the home page and the 404 the nav floats over the first screen (`<Base float>`); elsewhere it sits 16px from the top. Both stay in view while scrolling, so the compact state (after 80px) is seen. Hovering doesn't reopen it (the links would move under the pointer); keyboard focus does.
- **Fonts**: Martian Mono and Schibsted Grotesk, variable, Latin subset, as woff2 in `public/fonts/` (the same fonts as the woff files in `design/system/fonts/`, smaller), with `font-display: swap`. Both are preloaded in `Base.astro`: Schibsted for body text, Martian Mono for the hero headline.
- **Home page** (`src/pages/index.astro`, `src/components/home/`): the hero (signal field on a canvas, `src/scripts/field.ts`), what I do, built and shipped (tabs, `switcher.ts`), what people are saying (`ticker.ts` from five quotes), latest posts and the booking band. On phones the card rows swipe sideways with arrow buttons (`swipe.ts`). Every behaviour has a still state under reduced motion.
- **Blog** (`src/pages/blog/`, `src/components/blog/`): the index and topic pages share one template (header, topic chips, posts by year); a post has its header, the text with "on this page" (`toc.ts`), the published line, the author panel and "keep reading". The rules (keep reading, which headings go in "on this page", grouping by year) are plain functions in `src/lib/blog.ts`. Wording lives in `src/content/blog.yaml`. No booking band on blog pages.
- **Projects** (`src/pages/projects/index.astro`): every project from `src/content/projects.yaml` by `order`, each with a large still screenshot (never a link, no scroll effect), its facts and links; archived projects follow as quiet rows once there are any.
- **Feeds** (`src/lib/feed.ts`, `@astrojs/rss`): `/rss.xml` for every post and `/blog/topic/<id>/rss.xml` for each topic page, as raw XML with no stylesheet (Chrome removes XSLT on 17 November 2026). People reading in a browser get `/rss/`, a normal page that explains the feed and copies its address (`CopyButton`, `copy-text.ts`); every "rss feed" link goes there, and topic pages link to their row (`/rss/#topic-<id>`). Every page's `<head>` names the feed (`<link rel="alternate">`); topic pages add their own. Migrated posts keep their WordPress guid (`https://www.harrisonjennings.au/?p=<wpId>`), and `/feed/` 301s to `/rss.xml`, so subscribers carry over without old posts arriving again. Items carry the description, not the full text; when an item is opened, feed apps show the description and a link to the full post.
- **Legal pages** (`src/pages/[page].astro`): the privacy policy and terms of use from `src/content/pages/*.md`, at `/<file name>/`. One template: the date and a link to the other page, "the short version" from a `summary` list, the text beside "on this page" (h2s only), and a contact line. `::cookie-settings` in the Markdown places the button that reopens the consent choices.
- **Share cards** (`src/lib/og/`, `src/pages/og/[...path].png.ts`): a 1200 × 630 PNG per page, rendered at build to `/og/<path>.png` and named in `og:image` and `twitter:image` by `Base.astro`. Variants: home (also every page without its own: the legal pages and the 404), post, page (blog, topics, projects, rss) and project (rendered, but no page uses it until projects get pages of their own). Satori lays each card out as SVG with the brand fonts and sharp turns it into a PNG; the ember clouds are plain SVG gradients underneath. Satori can't read variable fonts, so the cards use static instances of the site's fonts in `src/assets/fonts/` (`scripts/build-og-fonts.py`). Martian Mono titles are broken into lines by character count (it's monospaced), so the brick stop always follows the last word. Dark only. A post's `socialImage` replaces its card.
- **Markdown** (`astro.config.mjs`, `src/lib/markdown/`): `@astrojs/markdown-remark` runs our plugins on every post and page. remark: callouts (`:::note`, via remark-directive), `::cookie-settings`, `{nozoom}`, reading time. rehype: h5/h6 to h4, framed tables with number columns, figures (reading each local image's size with sharp, so portrait images are capped before they load), and the code block wrapper. Code is highlighted at build by Shiki with a theme whose colours are the code tokens (CSS variables); every block carries `data-theme="dark"`, so code keeps the dark treatment on light pages too. Shiki also gets a small Velocity grammar, and a transformer for file names, highlighted lines and shell prompts. MDX posts get `<Figures>` and `<YouTube>` without importing them. Images are responsive (`image.layout: 'constrained'`); the image viewer (`lightbox.ts`) loads the largest size only when it opens. Post styles are in `src/styles/prose.css`.
- **Drafts**: shown in `npm run dev` only. The end-to-end tests build with `INCLUDE_DRAFTS=true`, so the draft formatting reference is tested; CI checks the production build has no drafts. Deploy with `npm run deploy` (or Workers Builds), which rebuilds without drafts, never by running `wrangler deploy` straight after the tests.
- **Booking** (`src/scripts/booking.ts`, the calendar from `BOOKING_URL`): nothing from Cal.com loads with the page. In the booking band, "view availability" opens the calendar inside the band and only then loads Cal.com's embed. Every "book a call" (nav, phone menu, hero, footer) links to `/#book`: on the home page it scrolls to the band and opens its calendar; on any other page it opens the same calendar in Cal.com's modal, with focus moved onto the modal's close button and back to the link when it closes. Never put `data-cal-link` on our own elements: Cal.com's embed turns them into popup triggers.
- **Design reference** (`design/system/`, `design/mockups/`): the approved design system, component notes and page screenshots. Reference only: Prettier, ESLint and `astro check` skip it.
- **Headers** (`public/_headers`): security headers on every response, and long immutable caching for hashed assets and fonts.
- **Redirects** (`public/_redirects`): one explicit 301 per old WordPress post and category URL, plus the old sitemap and feed URLs. No wildcards; the `redirects` end-to-end test checks every rule.
- **404**: `src/pages/404.astro` builds `404.html`, which Workers serves for any unknown path (`not_found_handling: 404-page`). It's the one inner page with the ember clouds and the bouncing dot (`<Logo loading>`), with the latest three posts; wording in `src/content/not-found.yaml`. WordPress-only URLs (`?p=` shortlinks, `wp-content` uploads) are left to lapse.

## tests

`npm run verify` runs both suites after format, lint and type checks, and CI runs the same steps on every pull request and on `main`.

- **Unit** (`tests/unit/`, Vitest, `npm run test`): the pure logic. The share cards (title sizes and line breaks, image paths, and each variant rendering to a 1200 × 630 PNG), the feeds (addresses, items, and a migrated post keeping its WordPress guid), `src/lib/posts.ts` (slugs, URLs, drafts, newest-first order, which topics earn a page) with `astro:content` mocked, and `buildTokensCss` from `scripts/build-tokens.mjs` against both the real `design/tokens.json` and small fixtures for the edge cases (fallback values, font paths, bad and duplicate names). `vitest.config.ts` uses Astro's Vite config, so `import.meta.env` behaves as it does in a build.
- **End-to-end** (`tests/e2e/`, Playwright, `npm run test:e2e`): builds the site, then tests `dist/` served by `wrangler dev` on port 8790, so `_headers`, trailing-slash handling and the 404 page behave as they do on Workers. Page lists come from the built sitemap, so new pages are covered automatically.
  - `pages`: every sitemap page returns 200; an unknown path returns 404, with the 404 page for browser page loads (Cloudflare sends other requests a bare "Not found").
  - `menu`: at phone width the menu opens with focus on its first link, keeps focus out of the page behind it, and closes on Escape or the close button with focus back on the menu button. It's a native modal `<dialog>`, so Tab steps out to the browser's own controls after the last item and back in from the first; the test allows that and fails if focus reaches the page.
  - `motion`: under `prefers-reduced-motion: reduce`, no animation runs on load or hover, the logo stays at rest, and the page is pixel-identical half a second apart.
  - `headers`: every rule in `public/_headers` is checked against a real response from a matching path.
  - `nav`: the nav's position (floating on the home page and the 404, 16px down elsewhere, in view while scrolling), compacting after 80px and reopening on hover, the current-page underline, and the footer logo drawing when it comes into view.
  - `blog`: the index (posts by year, the RSS link, no booking band), and on the formatting reference: the header and reading time, "on this page" marking the section being read (a closed panel on phones), h5 shown as h4, callouts, figures, number columns and footnotes, code blocks (file name, highlighted lines, copy without prompts, edge to edge on phones), the image viewer (zoom, stepping, Tab kept inside, Esc and focus return), `{nozoom}`, and YouTube loading only on play.
  - `home`: the hero, the scroll cue's fade, level tools lines in what I do, the project tabs by click and keyboard, the testimonials (still under five, moving with a working pause button from five), the phone swipe rows and stacked hero buttons, nothing third-party on load, and the booking calendar opening in place and only then requesting Cal.com.
  - `projects`: numbered entries with their facts and links, a screenshot that isn't a link, and no "archived" section until a project is archived.
  - `rss`: `/rss.xml` is raw RSS with no stylesheet, `/feed/` 301s to it, every page names it in `<head>`; the `/rss/` page copies the full address (and drops "https://www." on phones) and lists the latest posts.
  - `legal`: the privacy policy's date, link to the terms, short version, cookie settings button and h2-only "on this page"; the terms' "Effective" date and no short version.
  - `not-found`: the 404's links and latest posts, the dot bouncing (and resting under reduced motion), never clipped.
  - `redirects`: every rule in `public/_redirects` is an explicit path (no wildcards) that returns one 301 to a page answering 200.
  - `share`: each page names its card (its own, or the home card) in `og:image` and `twitter:image`, and the card is a 1200 × 630 PNG.
  - `theme`: dark on a first visit even when the device prefers light; the toggle switches, relabels and is remembered on the next page.
  - `a11y`: an axe scan (WCAG 2.2 A and AA rules) of every page and the 404 page, in dark and light (chosen through `hj-theme`, as the toggle does).

Run `npx playwright install chromium` once before the first end-to-end run. Tests that reach real Cloudflare (preview URLs, redirects on the live domain, Lighthouse) come in later phases: see the [roadmap](roadmap.md).

## what's coming (and where it goes)

- **Consent and analytics:** CookieConsent v3 with Google Consent Mode (advanced), loading the server-side GTM container from `measure.harrisonjennings.au`. Consent choices will be logged to D1 through a small Worker route. That will be the first non-static code, added to `wrangler.jsonc` as a `main` script with `run_worker_first` limited to the logging path, so pages stay static. The footer's "cookie settings" button already carries `data-cc="show-preferencesModal"` for it.
- **Content-Security-Policy:** added to `_headers` once the analytics, consent and booking sources are final. It will need the inline theme script's hash, and `app.cal.com` / `cal.com` for the booking calendar.
- **SEO:** structured data (Person and ProfessionalService on the home page, BlogPosting and BreadcrumbList on posts).

Never route every request through Worker code (`run_worker_first: true`). On the free plan, once the daily request cap is hit those requests fail instead of falling back to the static page.

## rules of thumb

- Prefer build time over request time. If something can be computed when building, it should be.
- No client framework. If a component needs more than a small script, discuss it first.
- No new colours or sizes outside `design/tokens.json`.
