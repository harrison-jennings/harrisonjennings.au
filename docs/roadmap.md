# roadmap

From WordPress on VentraIP to this repo, live before the hosting renews on **11 November 2026**.

**Target go-live: Wednesday 4 November.** WordPress stays underneath the new site for a week after that, so rolling back means deleting one Cloudflare route. If design slips, launch with the approved components and a simpler layout, and refine afterwards.

| #   | phase                     | target         | status      |
| --- | ------------------------- | -------------- | ----------- |
| 1   | inventory and backup      | by 20 Oct      | done        |
| 2   | brand identity and tokens | 18 Oct         | done        |
| 3   | scaffold and pipeline     | 18–20 Oct      | done        |
| 4   | page mockups              | 19–24 Oct      | done        |
| 5   | page build                | 22–30 Oct      | done        |
| 6   | content migration         | 22–30 Oct      | done        |
| 7   | analytics and consent     | 27 Oct – 1 Nov | launch left |
| 8   | SEO and quality           | 30 Oct – 3 Nov | in progress |
| 9   | cutover                   | 4 Nov          |             |
| 10  | observe and decommission  | 4–10 Nov       |             |

## 1. inventory and backup

- [x] Full backup from VentraIP (files and database), kept offline
- [x] WordPress export (Tools → Export → All content)
- [x] Pressidium settings and consent records, both Tag Manager containers
- [x] Plugin list and Yoast settings (in the VentraIP backup: the plugin folders and the database)
- [x] Crawl the live site and save the full URL list (the Yoast sitemaps: 6 posts, 4 pages, 8 categories)
- [x] Audit every DNS record in Cloudflare and note what each points at ([deployment.md](deployment.md#dns-records))
- [x] Strong sign-in everywhere: a passkey on GitHub; Cloudflare and Tag Manager through the Google account, which has a passkey; an authenticator app on VentraIP

## 2. brand identity and tokens

- [x] Logo, motion, colour, ember, type, buttons, links, nav, footer and projects approved
- [x] `design/tokens.json` and [brand.md](brand.md)

## 3. scaffold and pipeline

- [x] Astro, TypeScript (strictest), content collections, tokens build, fonts, favicons
- [x] Core components: logo, nav and mobile menu, footer, button, link, icon button, project row, live signal, tag
- [x] CI, Dependabot, templates, docs
- [x] Private GitHub repo, first push, repository settings
- [x] Unit and end-to-end tests in `npm run verify` and CI ([architecture.md](architecture.md#tests))
- [x] Workers Builds connected; previews behind Cloudflare Access; a branch preview checked ([deployment.md](deployment.md))

## 4. page mockups

The hero first, then each page, approved before it's built.

- [x] Hero: giant Martian Mono over a signal-particle field that reacts to the pointer, with a designed phone version and a still version for reduced motion
- [x] Home: hero, services, built and shipped, testimonials, latest posts, booking
- [x] Blog index and topic pages, with how topics show on a post
- [x] Post page: title, meta, cover, body styles (headings, lists, quotes, code, images, callouts), related posts
- [x] Projects index (the expanding screenshot was tried and dropped: screenshots stay still)
- [x] Privacy, terms and 404
- [x] Social share card

## 5. page build

Built in five stages, one pull request each, from `design/` (see `design/README.md`).

- [x] Stage 1, foundations: tokens, dark-first theme and toggle, fonts, the shared column, nav, mobile menu, footer, shared components
- [x] Stage 2, home
- [x] Stage 3, blog: index, topic pages, posts, code blocks, image viewer
- [x] Stage 4, projects, RSS, legal pages, 404
- [x] Stage 5, social share cards
- [x] Each approved mockup built as a page, from the existing components and tokens
- [x] Phone, keyboard, focus, contrast and reduced-motion checks on every page (automated checks and phone testing; no separate screen-reader pass)
- [x] Booking: Cal.com embed with the bounce loader

## 6. content migration

- [x] Convert the export (images downloaded at full size, renamed and given alt text)
- [x] Clean up block-editor markup and code blocks in each of the 6 posts; keep each post's WordPress ID as `wpId` (the `?p=` number in the live feed's `<guid>`)
- [x] Privacy and terms into `src/content/pages/`: the text, dates, the short version and the contact email
- [x] Turn the 8 populated categories (and any tags) into a short `topics.yaml`; merge any that overlap
- [x] A 301 in `public/_redirects` for every old post URL (`/YYYY/MM/<slug>/` → `/blog/<slug>/`) and category URL, from the crawl
- [x] Redirect tests: a Playwright test that every source in `public/_redirects` returns a single 301 to a page that returns 200, and that no rule uses a wildcard
- [x] Projects, services and testimonials into their files

## 7. analytics and consent

- [x] CookieConsent v3 with Google Consent Mode (advanced); consent reset at launch (a new cookie, revision 1)
- [x] Cookie banner and preferences dialog, to the `14-consent` mockups
- [x] Tag Manager and the data layer, loading through `measure.harrisonjennings.au` (Live on production, Testing on previews)
- [x] In Tag Manager: remove the Pressidium consent tag and template (published to Testing; Live at cutover)
- [ ] Confirm the advertising cookies once an ad tag is switched on
- [x] Every consent state tested in Tag Manager preview and GA4 DebugView
- [x] D1 consent logger (a Worker route; pages stay static)
- [ ] Records confirmed arriving in the production D1
- [x] Pressidium records exported and archived off-site
- [x] Content-Security-Policy in `_headers`, Report-Only, with violation reports counted in D1 (`/api/csp-report`)
- [x] In Tag Manager: replace or remove the Custom JavaScript variables the GA4 tags use, and the "GTM Environment" Custom HTML tag, so the policy needs no `'unsafe-eval'` or `'unsafe-inline'` (published to Testing)
- [ ] A week of clean production CSP reports, then switch the header from Report-Only to enforced
- [x] Cookie list as data (`src/content/consent.yaml`), feeding both the cookie preferences dialog and the privacy policy (`::cookie-table{category="…"}`); a table on desktop, stacked on phones
- [x] Update the privacy policy for the new site: Cloudflare hosting, no WordPress, the consent records, the new consent cookie; set its date at cutover

## 8. SEO and quality

Better than the WordPress site, not just level with it: most of its posts sat in Search Console as "crawled – currently not indexed".

- [x] Structured data: WebSite and Person on every page, ProfessionalService on the home page, BlogPosting on posts, Blog and CollectionPage on the blog and topic pages, breadcrumbs on inner pages
- [x] Sitemap `lastmod` from post and page dates; no canonical address on pages kept out of search
- [x] Search Console exports reviewed (indexing reasons, queries, pages): most posts were "discovered – currently not indexed", never crawled at all
- [x] Search titles and descriptions (`searchTitle`, `searchDescription`) for every post, built around each post's search terms; the headline and dek on the page stay as written
- [x] Thin utility pages (`/rss/`) kept out of search and the sitemap
- [x] Redirects for the old author archive and the remaining WordPress sitemaps Search Console still knew
- [x] 🛠️ CI Orchestrator: one workflow calling quality, end-to-end, Lighthouse, CodeQL and dependency review (the merge rule's required checks updated with it)
- [x] 🚀 CD Orchestrator: posts each PR's preview link, and after `main` deploys, smoke-tests production (`scripts/smoke-test.sh`); production checks switched on at cutover
- [x] Preview and Production recorded as GitHub deployments, so the repository's Deployments panel shows them (Production from cutover)

- [x] Every URL in the crawl either returns 200 or 301s to its new home in one hop; WordPress-only URLs return a real 404 (`crawl` end-to-end test, from `tests/e2e/fixtures/wordpress-urls.json`; `?p=` shortlinks show the home page, since a static site ignores the query)
- [x] Old Yoast and WordPress sitemap URLs 301 to the new sitemap index
- [ ] After launch, watch Search Console for the moved posts being re-indexed at their new URLs
- [x] Titles and descriptions for every page, post and topic
- [ ] Sitemap, the feeds (`/rss.xml`, and `/feed/` redirecting to it), social cards and structured data validated
- [x] Lighthouse 95+ on performance, accessibility and SEO (and best practices): 97–100 on the four checked pages; the home page's SEO counts once its `noindex` goes at launch
- [x] Lighthouse CI on every pull request, failing below 95 on performance, accessibility, best practices and SEO
- [ ] Remove `noindex` from the placeholder home page, and drop its SEO exception in `lighthouserc.json` (the second pattern then matches every page)

## 9. cutover

- [ ] Freeze WordPress edits
- [ ] Workers Route `www.harrisonjennings.au/*`; redirect rule from the bare domain to www
- [ ] Test the rollback once: delete the route, confirm WordPress serves, re-add it
- [ ] In Tag Manager, publish the version that's on Testing to Live, then check your own visit reaches the production GA4 property's Realtime report (the server container picks the property from the `environment` label)
- [ ] Spot-check pages, consent banner, booking, analytics and consent logging on the live domain; `bash scripts/smoke-test.sh https://www.harrisonjennings.au` passes
- [ ] Change the `PRODUCTION_LIVE` repository variable from `false` to `true`, so every deploy is smoke-tested
- [ ] Clean up WordPress-era Cloudflare settings (cache and page rules, Automatic Platform Optimization); keep Rocket Loader off
- [ ] In Search Console, remove the old WordPress sitemaps and submit `sitemap-index.xml`; annotate the date in GA4
- [ ] Request indexing for each post with URL Inspection; check the structured data in Search Console's enhancements reports
- [ ] Turn on Crawler Hints (IndexNow) in Cloudflare, so Bing hears about changes straight away
- [x] Send `X-Robots-Tag: noindex` from `measure.harrisonjennings.au`, so its Tag Manager pages (`ns.html`) drop out of search (a Cloudflare response header rule, 20 October)
- [ ] Link each post from where its project lives (leadlens site and README, the API reference), and share the posts on LinkedIn

## 10. observe and decommission

- [ ] A week of watching errors, 404s, analytics parity, bookings and consent rates
- [ ] Swap the route for a Workers Custom Domain; replace the apex A record (VentraIP) with a proxied `AAAA 100::` placeholder, so the bare-domain redirect keeps working
- [ ] Final archive, then cancel the hosting (not the domain) before 11 November
- [ ] Delete the WordPress install and database on VentraIP; delete the `_cpanel-dcv-test-record` and `default._domainkey` TXT records
- [ ] Registrar lock on; DNSSEC on in Cloudflare, then the DS record at the registrar (a quiet week)
- [ ] DMARC from `p=none` to `p=quarantine` once WordPress is gone and the reports show only iCloud sending

## after launch

- [ ] Style guide at `/styleguide/`: the full design system, page mockups and formatting reference, built from the real components
- [ ] Posts where Search Console shows demand and nothing ranks: Marketo Munchkin (the tracking code) and Velocity scripting

Front Matter CMS (optional), site search with Pagefind once there are 20+ posts, a contact form with Turnstile, uptime monitoring, and a decision on AI crawlers in Cloudflare.
