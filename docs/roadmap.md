# roadmap

From WordPress on VentraIP to this repo, live before the hosting renews on **11 November 2026**.

**Target go-live: Wednesday 4 November.** WordPress stays underneath the new site for a week after that, so rolling back means deleting one Cloudflare route. If design slips, launch with the approved components and a simpler layout, and refine afterwards.

| #   | phase                     | target         | status      |
| --- | ------------------------- | -------------- | ----------- |
| 1   | inventory and backup      | by 20 Oct      | to do       |
| 2   | brand identity and tokens | 18 Oct         | done        |
| 3   | scaffold and pipeline     | 18–20 Oct      | in progress |
| 4   | page mockups              | 19–24 Oct      | done        |
| 5   | page build                | 22–30 Oct      | in progress |
| 6   | content migration         | 22–30 Oct      |             |
| 7   | analytics and consent     | 27 Oct – 1 Nov |             |
| 8   | SEO parity and quality    | 30 Oct – 3 Nov |             |
| 9   | cutover                   | 4 Nov          |             |
| 10  | observe and decommission  | 4–10 Nov       |             |

## 1. inventory and backup

- [ ] Full backup from VentraIP (files and database), kept offline
- [x] WordPress export (Tools → Export → All content)
- [ ] Plugin list, Yoast and Pressidium settings, the Pressidium consent records, both Tag Manager containers
- [x] Crawl the live site and save the full URL list (the Yoast sitemaps: 6 posts, 4 pages, 8 categories)
- [ ] Audit every DNS record in Cloudflare and note what each points at; leave the iCloud mail records (MX, SPF, DKIM) alone
- [ ] Passkeys or hardware keys on GitHub, Cloudflare, the registrar and Tag Manager

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
- [ ] Each approved mockup built as a page, from the existing components and tokens
- [ ] Phone, keyboard, focus, contrast and reduced-motion checks on every page
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

- [ ] CookieConsent v3 with Google Consent Mode (advanced); consent reset at launch
- [ ] Tag Manager and the data layer, loading through `measure.harrisonjennings.au`
- [ ] Every consent state tested in Tag Manager preview and GA4 DebugView
- [ ] D1 consent logger (a Worker route; pages stay static); records confirmed arriving
- [ ] Pressidium records exported and archived off-site
- [ ] Content-Security-Policy in `_headers`
- [ ] Cookie list as data (`src/content/cookies.yaml`: name, domain, expiry, purpose, category), feeding both the consent banner's cookie table and the privacy policy (a `::cookie-table{category="…"}` directive replacing the hand-written tables); laid out as a table on desktop and stacked on phones
- [ ] Update the privacy policy for the new site: hosting on Cloudflare rather than VentraIP, no WordPress, the new consent cookie in the necessary-cookies table; then its date

## 8. SEO parity and quality

- [ ] Every URL in the crawl either returns 200 or 301s to its new home in one hop; WordPress-only URLs return a real 404
- [ ] Old Yoast and WordPress sitemap URLs 301 to the new sitemap index (already in `_redirects`)
- [ ] After launch, watch Search Console for the moved posts being re-indexed at their new URLs
- [ ] Titles and descriptions for every page, post and topic
- [ ] Sitemap, the feeds (`/rss.xml`, and `/feed/` redirecting to it), social cards and structured data validated
- [ ] Lighthouse 95+ on performance, accessibility and SEO
- [ ] Lighthouse CI on every pull request, failing below 95 on performance, accessibility and SEO
- [ ] Remove `noindex` from the placeholder home page

## 9. cutover

- [ ] Freeze WordPress edits
- [ ] Workers Route `www.harrisonjennings.au/*`; redirect rule from the bare domain to www
- [ ] Test the rollback once: delete the route, confirm WordPress serves, re-add it
- [ ] Spot-check pages, consent banner, booking, analytics and consent logging on the live domain
- [ ] Clean up WordPress-era Cloudflare settings (cache and page rules, Automatic Platform Optimization); keep Rocket Loader off
- [ ] Submit the sitemap in Search Console; annotate the date in GA4

## 10. observe and decommission

- [ ] A week of watching errors, 404s, analytics parity, bookings and consent rates
- [ ] Swap the route for a Workers Custom Domain; remove the VentraIP DNS record
- [ ] Final archive, then cancel the hosting (not the domain) before 11 November
- [ ] Delete the WordPress install and database on VentraIP
- [ ] Registrar lock and DNSSEC on; check SPF, DKIM and DMARC

## after launch

- [ ] Style guide at `/styleguide/`: the full design system, page mockups and formatting reference, built from the real components

Front Matter CMS (optional), site search with Pagefind once there are 20+ posts, a contact form with Turnstile, uptime monitoring, and a decision on AI crawlers in Cloudflare.
