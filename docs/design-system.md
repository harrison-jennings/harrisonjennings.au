# Design system

[design.harrisonjennings.au](https://design.harrisonjennings.au/) is the reference for the brand, every component, every element a post can hold, every token and every kind of page on the site. The decision is in `docs/decisions.md`; the pages were built from approved mockups (the brief and the design hand-off are in the private notes repo).

**The design language it documents is the site's own.** The brand identity, the palette, the type pairing, the motion and every component were designed for harrisonjennings.au; none of it comes from an off-the-shelf Astro theme or template. The design system is made from the site itself: it imports the site's real components, styles, tokens and Markdown pipeline, so it shows exactly what's live and can't drift from it, and most of what it says is read from the code rather than typed in.

## What's in it

Six sections, each a group of pages:

- **overview** (`/`): what it is, the counts, where to start, how to use it, and what changed.
- **brand:** logo, colour, typography, voice and tone, imagery and motion, icons.
- **foundations:** spacing, radius, layout and breakpoint, accessibility, and every token.
- **components:** a page for each of the site's 26 components.
- **content:** a page for every element a post can hold, the front matter reference, and image guidance.
- **templates:** a gallery of every kind of page on the site.

Search finds any of them from the header, `/` or ⌘K (see [Search](#search)).

## How it's built

A second Astro site in `design-system/`, an npm workspace of this repository, deployed as its own Worker (`harrisonjennings-au-design`). It imports from the main site and never copies:

- **Components, styles and tokens** from `src/components/`, `src/styles/` (including the generated `tokens.css`) and `src/lib/`.
- **Content:** the site's content collections (`src/content.config.ts`, whose paths are relative to itself so another Astro root can load them), so components that read posts, projects or the home page's wording show exactly what the site does.
- **The Markdown pipeline** from `src/lib/markdown/config.ts`, the same module `astro.config.mjs` uses, so a content example renders exactly as in a post.
- **Public files** the site's CSS and pages need (`public/fonts/`, `public/brand/`, and the favicons): served by the dev server and copied into the build by `design-system/src/lib/shared-public.ts`.

### Pages and the shell

Each page is an MDX file in `design-system/src/content/docs/<section>/<page>.mdx`, published at `/<section>/<page>/`, so its wording can be edited without touching code. Its frontmatter gives the `title`, the `lead`, its `group` and `order` within the section, and optionally:

- `facts`: a line of label, value and link under the lead;
- `component`: the file it documents (the page head links to it, and for a component says where it's used, from the site's imports);
- `snippets`: the VS Code snippets that insert a content element (checked against `frontmatter.json`);
- `related`: pages with a line each, which close the page and are listed in "on this page".

The six sections and their groups are the one fixed list (`src/lib/sections.ts`). Everything else is built from the pages that exist (`src/lib/nav.ts`): the header's section links, the sidebar's groups and counts, the phone menu, the page picker and the breadcrumb. A new page appears in its group by itself, and a section or group shows once it has a page. `/<section>/` redirects to the section's first page.

The shell (`layouts/Shell.astro`, `styles/shell.css`, `scripts/shell.ts`) has the brick line across the top and "design system" beside the logo on every page, search in the header, a sidebar whose groups open and close (remembered for the visit), "on this page" from the page's `##` headings (the site's own `src/scripts/toc.ts`), and on phones a page picker and a full-screen menu. Without JavaScript every group shows. Below 1200px "on this page" goes and the header drops the name; below 1024px the shell is the phone's. The theme toggle is the site's own; the design system is another origin, so it remembers its choice separately. Links that leave it, to harrisonjennings.au included, open in a new tab.

### Search

Search (`components/Search.astro`, `styles/search.css`, `scripts/search.ts`) is a dialog over the page, full screen on phones, opened by the header's search button, the phone menu's search field, `/` from anywhere but a field, or ⌘K / Ctrl K. Below 1400px the header's pill becomes the phone header's icon button, as the pill needs a 1440 header's room. Without JavaScript there's no way in.

- **The index** is built after the build by Pagefind (`lib/search.ts`) into `dist/pagefind/`, and searched in the browser: no server. It holds the pages that mark their content with `data-pagefind-body` (every docs page and the overview, through the shell's `search` prop, which also says where results live: "content / text"), split into sections at their `##` headings. Left out with `data-pagefind-ignore`: the breadcrumb, preview frames (their controls and code), related pages and "what changed"; and whatever's `aria-hidden`. The front matter reference's field names count as headings. Pagefind reads a copy of each page with a space between tags, as Astro's compressed HTML would otherwise run neighbouring words together.
- **Before typing:** the six sections, and the pages used most while writing (`src/content/search.yaml`, by page id; the build fails on one that doesn't exist).
- **Results** come from the second character, 120ms after the last key: eight pages at a time, each with up to three of its sections, matches underlined in brick. The arrows move through them with focus staying in the field; Enter opens one; Esc clears the field, then closes. The loading state shows only if the first search (which loads the index) takes over 300ms; if the index doesn't arrive, "try again".
- **A token's card:** a query that's exactly a token's name (`accent`, `--accent`, `var(--accent)`) gets its card above the results, from `tokens.json` rather than the index: both themes' values, the copy chip, what it's for, and a link to the token table. The cards are on one page, `/search/tokens/` (`pages/search/tokens.astro`, `components/TokenCard.astro`), fetched the first time a query names a token.
- **Arriving on a result** (`scripts/arrive.ts`): the result's address carries the query (`?q=`); Pagefind's highlight script marks the matches in the page's content, the page scrolls the first (after the section the result named) a third of the way down the screen, and a pill offers "clear". Esc clears too. The query leaves the address at once, so a reload or a copied link doesn't bring the marks back. A match in a kind of token the table is hiding switches the table to that kind.

### Specimens and previews

Every example in `design-system/src/examples/` gets a specimen page at `/specimens/<name>/` (`pages/specimens/[name].astro`): the example on its own with the site's real CSS (`layouts/Specimen.astro`).

- A component example (`.astro`) renders as it is: small ones in a centred row, page-level ones (the nav, the home and blog sections) with a page's gutters, or edge to edge (the hero, the phone menu, which opens once it's loaded).
- A content example (`.md`, or `.mdx` for `<Figures>` and `<YouTube>`, which it provides as a post page does) goes through the Markdown pipeline into prose, in a post's column, with a post's code-block copy buttons, image viewer and video player. A post's own images are borrowed and shown as `./image.png`.
- In a preview, the site's own links stay put rather than load another page into the frame.

The preview frame (`components/Preview.astro`, `styles/preview.css`, `scripts/preview.ts`) shows the specimen in an iframe kept at a true width and scaled to fit, never squashed: **fit** (the column's width), **phone 390** or **desktop 1280**. Iframes, because the site's layout responds to the screen's width, not a container's. Themes: dark, light, or both, following the page's until the reader picks one. Tall examples are capped at 360px until "show full height"; "open" shows the specimen on its own; under reduced motion nothing in it animates.

**Code to copy** comes from the example itself, never a second copy (`lib/example.ts` rewrites its imports to read as they would in the site), with the component's source or script on further tabs, highlighted with the site's own Shiki theme on the dark code treatment. Code over 12 lines is clipped until "show all". Without a specimen, the frame is the code panel alone (the front matter reference's full example).

### Read from the code

Almost nothing the pages state is typed in:

| what                              | from                                                                                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| every token, its values and usage | `design/tokens.json` (`lib/tokens.ts`): the palette, token table, type scale, spacing, radius, sizes and motion                                                       |
| contrast ratios                   | calculated at build with WCAG's formula (`lib/contrast.ts`); a colour change updates every ratio and a failure shows as such                                          |
| logo sizes                        | each `<Logo size>` in `src/` and the compact nav's CSS (`lib/logo-sizes.ts`), weighted by the size each is drawn at (the compact nav's is the nav's own mark, shrunk) |
| icon names                        | `Icon.astro`                                                                                                                                                          |
| props tables                      | each component's own `interface Props`, with its doc comments (`lib/props.ts`), so every prop needs one                                                               |
| "used in"                         | the site's imports (`lib/site-source.ts`), naming places by their own pages where they have one                                                                       |
| VS Code snippets                  | `frontmatter.json`                                                                                                                                                    |
| the front matter reference        | the posts schema (fields, order, what's required), Front Matter's descriptions, and the newest post with each field                                                   |
| the overview's counts             | the tokens, the pages and the templates                                                                                                                               |

### Page patterns

- **Brand and foundations** use the furniture in `design-system/src/components/` (styles in `styles/furniture.css`): the copy chip, swatches, contrast pairs, the token table (filtered by kind, kept in the address as `?kind=type`), do/don't cards (a "don't" is an inert picture, hidden from screen readers and the keyboard), download cards, the type scale and the logo pieces. Swatches and samples set `data-theme` on themselves, so they're painted with that theme's token.
- **Component pages** follow the button's: the preview, variants and states, when to use it, props, accessibility and related.
- **Content pages** follow the callout's: the rendered element, its Markdown, its kinds, when to use it and related. The front matter reference fails the build on a field with no description, or one whose limit its description doesn't state.
- **The templates gallery** shows every page type from `design-system/src/content/templates.yaml`, with thumbnails of its first screen at both widths and themes, and "open live".

The site's own components are used inside all of these as they are: `Logo`, `Button`, `TextLink`, `Tag`, `Steps`, `PostCardView` (the post card's look, which `PostCard` fills from a post) and the rest.

## Keeping it current

Most of it keeps itself current, because it's read from the code. What needs a hand:

- **"what changed"** on the overview is `design-system/src/content/changes.yaml`: a row per change worth knowing about (date, one line, the pull request), newest first, written by hand so it says what changed for someone using the design system.
- **The templates' thumbnails** are snapshots: after a change to a page's first screen, or a new template, start `npm run preview` and run `npm run design:shots`, then commit the images. Workers Builds has no browser, so they can't be made there.
- **The README's screenshot**: start `npm run design:preview`, then `npm run readme:design-screenshot`.
- **A new component** needs a page (or a line in `tests/e2e/design-system/components.spec.ts` naming the page that shows it); **a new snippet** needs naming on a content page. The tests fail until they're there.
- **Wording** is each page's MDX, and the overview's is `design-system/src/content/overview.yaml`.
- **Search** indexes itself at every build. What it offers before anything's typed is `design-system/src/content/search.yaml`. Something on a page that isn't what the page says (controls, links on to other pages) gets `data-pagefind-ignore`.

## Working on it

```sh
npm run design:dev       # http://localhost:4322
npm run design:build     # design-system/dist
npm run design:preview   # build, then serve through Wrangler on :8791, as Cloudflare will (search needs this:
                         # its index is built with the site, so under design:dev it says it couldn't load)
npm run design:shots     # the templates gallery's thumbnails, from `npm run preview` on :8787
```

To add a page, add its MDX file with that frontmatter; to add a group or section, add it to `src/lib/sections.ts`.

**Testing:** `npm run check` type-checks both sites; `npm run test:e2e` builds both and runs the `design-system` Playwright project (`tests/e2e/design-system/`) beside the site's tests. In CI it has its own runner, beside the site's Chromium and WebKit runs. On every page, at phone and desktop widths and in both themes: axe finds nothing, nothing scrolls sideways, and every preview loads. Beyond that: search (opening it every way, the keyboard, results, a token's card, no results, a failed index, arriving on a result, and axe with it open), the shell and phone menu from the keyboard, the preview frame, the token table's filters and counts against `tokens.json`, contrast against an independent calculation, the downloads, coverage of every component and snippet, the front matter reference against the schema, and every template's thumbnails.

## Headers, downloads and the stamp

- **Headers** (`design-system/public/_headers`): `X-Robots-Tag: noindex, nofollow` on every response (`design-system/public/robots.txt` allows crawling, or crawlers couldn't read it), `X-Frame-Options: SAMEORIGIN`, and an enforced Content-Security-Policy (`design-system/src/lib/csp.ts`, written by the same build step as the site's) that lets pages frame only each other, and allows `'wasm-unsafe-eval'` for search's WebAssembly.
- **Downloads** are served by the design system, so their links never go stale: `/tokens.css`, `/tokens.json`, the logo marks as SVG and as 1024px PNGs drawn from them at build with sharp, and the favicons.
- **The build stamp** in the footer names the commit and date it was built from, after the site's live dot.

## Deploying

Workers Builds, from the Worker `harrisonjennings-au-design` connected to this repository:

| Setting           | Value                                                                                                                                                                                                                                                             | Why                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root directory    | `design-system`                                                                                                                                                                                                                                                   | Cloudflare checks the Worker's name against the Wrangler config in the root directory; at the repository root it would read the site's `wrangler.jsonc` and offer to rename it |
| Build command     | `npm run build:cloudflare`                                                                                                                                                                                                                                        | Installs from the repository root (Cloudflare's own install step runs in `design-system/` and installs only the workspace), then builds                                        |
| Deploy command    | `npm run deploy`                                                                                                                                                                                                                                                  | `wrangler deploy`                                                                                                                                                              |
| Preview command   | `npm run preview`                                                                                                                                                                                                                                                 | `wrangler preview`, for every other branch                                                                                                                                     |
| Build watch paths | include `design-system/*`, `src/*`, `design/*`, `public/fonts/*`, `public/brand/*`, `public/favicon.svg`, `public/favicon.ico`, `public/icon-192.png`, `public/icon-512.png`, `frontmatter.json`, `package.json`, `package-lock.json`, `scripts/build-tokens.mjs` | Builds only when something it shows could have changed. All of `src/`: it renders the site's content, and reads its pages and layouts to say where each component is used      |

`design-system/package.json` pins npm (`packageManager`) and `design-system/.nvmrc` links to the site's Node version, because Cloudflare reads both from the root directory. The custom domain is set on the Worker in the dashboard, so `wrangler deploy` leaves it alone. Previews are behind Cloudflare Access, as the site's are.

**After each deploy** the 🚀 CD Orchestrator checks and records it, through the same workflows as the site with the design system's own scripts. It runs when Cloudflare's "Workers Builds: harrisonjennings-au-design" check finishes, so a commit the design system wasn't built for gets no run:

- **On a branch** (`preview-deployment.yml`): records a **Design system preview** deployment with the branch's Preview URL.
- **On main:** smoke-tests that exact version through its preview address with the Access service token (`production-version.yml`, running `scripts/design-smoke-test.sh`), then checks the live domain and records a **Design system** deployment (`production-live.yml`, running `scripts/design-live-check.sh`: its `robots.txt`, which Bot Fight Mode lets through to GitHub's runners, names the design system and carries the noindex header).

The scripts take the Worker's name in `WORKER` (`version-url.sh`, `preview-url.sh`), because each Worker posts its own check on a commit.
