# deployment

The site deploys from GitHub to Cloudflare with [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).

| branch        | goes to                                            |
| ------------- | -------------------------------------------------- |
| `main`        | production: www.harrisonjennings.au                |
| anything else | a Preview on workers.dev, behind Cloudflare Access |

The Worker is `harrisonjennings-au`, on the `harrisonjennings-au.workers.dev` subdomain. A branch's Preview URL is `<branch>-harrisonjennings-au.harrisonjennings-au.workers.dev` (slashes become hyphens: `chore/tests` → `chore-tests-…`), and the **🚀 CD Orchestrator** (`.github/workflows/cd-orchestrator.yml`, calling `preview-link.yml`) comments it on the pull request as soon as it opens. Cloudflare's own comment only appears when the PR was already open when a build ran, so it's missing on a PR opened after its branch's first push; later pushes still get it. The production workers.dev URL is off (`workers_dev: false`); production is reached only through the www route from cutover.

## one-time setup in Cloudflare

Done on 18 October 2026. Kept here to rebuild it if needed.

1. **Workers & Pages → Create application → Import a repository.** Install the Cloudflare Workers & Pages GitHub app on this repository only, and pick `harrison-jennings/harrisonjennings.au`.
2. **Build settings.**
   - Worker name: `harrisonjennings-au` (must match `name` in `wrangler.jsonc`, or every build fails)
   - Production branch: `main`
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Preview command: `npx wrangler preview` (needs the `previews` block in `wrangler.jsonc`)
   - Root directory: `/`
   - No build variables: the build image reads `.nvmrc` (Node 24). Set `NODE_VERSION` = `24` only if that ever stops working.
3. **Preview builds.** **Settings → Build**, Previews Base: turn on **Builds for Preview branches**. `preview_urls: true` in `wrangler.jsonc` keeps Preview URLs on.
4. **Lock the previews.** The Worker's **Access** tab → **Protect this Worker behind Access** → **Previews only** (never **All traffic**: that would put a login in front of the live site once the route is added). Policy: **Cloudflare account**, so only members of the account (just Harrison) can sign in.
5. **Service token for automated checks.** **Zero Trust → Access controls → Service credentials → Service Tokens**: `preview-checks`, valid for a year. A **Service Auth** policy (`preview-checks service token`) that includes it sits alongside the account policy. Scripts send `CF-Access-Client-Id` and `CF-Access-Client-Secret`; locally they live in `.env.preview` (ignored by git). Renew the token before it expires in October 2027.

## the consent log (D1)

The consent log is a D1 database bound to the Worker as `CONSENT_DB` (`wrangler.jsonc`), with its schema in `migrations/`. One-time setup:

1. **Storage & databases → D1 → Create database**: `harrisonjennings-consent`, location Oceania. Its ID goes in `database_id` in `wrangler.jsonc`.
2. **Apply the schema**: `npx wrangler d1 migrations apply CONSENT_DB --remote` (and again whenever a new file lands in `migrations/`).
3. **The IP hashing key**: the Worker's **Settings → Variables and secrets → Add → Secret** (the runtime section, production only: one under **Build** is invisible to the running Worker, and rows then store no hash), `CONSENT_IP_KEY`, a long random value (`openssl rand -hex 32`). Keep a copy in your password manager: without it, a stored hash can't be checked against an IP. Never change it unless you mean to: rows hashed with the old key stop matching.

**Previews** don't inherit production bindings, so they write to their own database, `harrisonjennings-consent-preview` (`previews.d1_databases` in `wrangler.jsonc`), and test clicks never reach the production log. Create or update its table with `npx wrangler d1 migrations apply CONSENT_DB --remote -c wrangler.preview-migrations.jsonc`. Previews have no `CONSENT_IP_KEY`, so their rows store no IP hash.

To look someone up, run a query in the database's **Console** tab, e.g. `SELECT * FROM consent_log WHERE consent_id = '…' ORDER BY created_at`. Rows from previews have `environment = 'preview'`.

## CSP reports

The Content-Security-Policy is sent Report-Only: nothing is blocked, and browsers report anything outside it to `/api/csp-report`, which counts each distinct violation in the `csp_report` table of the same databases (migration `0002`). Apply it to both with the two `migrations apply` commands above.

To see what the policy still misses, run in the production database's **Console** tab:

```sql
SELECT directive, blocked, source, SUM(count) AS reports, MAX(last_seen) AS last
FROM csp_report WHERE environment = 'production'
GROUP BY directive, blocked, source ORDER BY reports DESC;
```

Each row is either a source to add to `src/lib/csp.ts` or something to remove at its origin (usually a Tag Manager tag or variable). On previews, Access may stop reports from arriving; the browser's console lists the same violations, marked `[Report Only]`. When the production list has been empty for a week, switch the header to `Content-Security-Policy` in `cspHeaders()`.

## GitHub repository settings

Set in GitHub, not in the repository, so recorded here.

- **Ruleset "Protect main"** (**Settings → Rules → Rulesets**):
  - `main` can't be deleted or force-pushed, and history stays linear;
  - every change arrives through a pull request, squash-merged, with review threads resolved;
  - three checks must pass on an up-to-date branch, each pinned to GitHub Actions as its source: `quality / Format, lint, types and build`, `end-to-end / Playwright` and `lighthouse / Lighthouse`. If a CI job is renamed, update these in the same change, or pull requests wait forever on a check that never reports;
  - no bypass list: even an admin can't skip the rules, so changing them means editing the ruleset.
  - `.github/rulesets/main.json` is a copy of it, for rebuilding (**New ruleset → Import a ruleset**). GitHub doesn't read the file, so update it whenever the ruleset changes.
- **Merging:** squash only, titled from the pull request; branches are deleted after merge; "update branch" is offered.
- **Actions** (**Settings → Actions → General**): only actions published by GitHub (`actions/…`, `github/…`) and this repository's own workflows may run. A third-party action fails until it's allowed there; prefer a GitHub-owned action or a plain `run:` step. The workflow token is read-only by default and can't approve pull requests.
- **Secrets:** `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`, the `preview-checks` Access service token, for the CD Orchestrator's smoke test of each deployed version (only `main` and manual runs use them).
- **Security:** Dependabot alerts and security updates are on. Secret scanning, push protection and code scanning need the repository to be public (or a paid plan for an organisation): CodeQL and dependency review are already wired in and start when it is.
- **Environments and deployments:** Cloudflare deploys, but only reports back as a check, so the 🚀 CD Orchestrator records each deploy as a GitHub deployment. **Preview** is recorded once a pull request's preview build is live, with the branch's Preview URL. **Production** is recorded with each smoke-tested deploy of `main`, from cutover. Both environments were created by those jobs and have no protection rules. They show in the repository's **Deployments** panel (the About settings ⚙ → **Deployments**, which GitHub only keeps ticked once a deployment exists).
- **Apps:** Cloudflare Workers and Pages, with access to this repository only.

## after each deploy

After every push to `main`, the **🚀 CD Orchestrator** waits for Cloudflare's production deploy, then runs `scripts/smoke-test.sh` against **that exact version's preview address** (`https://<first 8 characters of the Version ID>-harrisonjennings-au.harrisonjennings-au.workers.dev`, from Cloudflare's check). It checks:

- the home page (with the cookie banner and structured data), the blog, a post and projects load;
- an old WordPress URL 301s to its post, and an unknown page 404s;
- the security headers and CSP are present;
- the sitemap, feed and robots.txt load, and the Worker answers.

**Why not the real domain:** Bot Fight Mode challenges GitHub's runners (they come from data centres; tested on 20 October), and the free plan can't exempt them. The preview address is on Cloudflare's `workers.dev`, outside the zone's bot protection, and behind Access, so the job sends the `preview-checks` service token from the repository secrets `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`. Renew them with the token (October 2027).

**From cutover** (the repository variable `PRODUCTION_LIVE` is `true`, under **Settings → Secrets and variables → Actions → Variables**), a second job checks the live domain as far as Bot Fight Mode allows (`scripts/live-check.sh`: `www`'s robots.txt names `sitemap-index.xml`, so the route is serving this site; the bare-domain redirect, unless it's challenged) and records the deployment to Production.

A failure emails you. To roll back, open the Worker's **Deployments** tab in Cloudflare and deploy the previous version. The smoke test also runs by hand against `www` from a home network, which Bot Fight Mode lets through.

## cutover (20 October)

Rehearsed on 20 October 2026 against the live Cloudflare settings, and run that night, two weeks ahead of the 4 November target; the launch steps took about an hour. The switch is a Workers Route on `www`, not a DNS change, so it takes effect at once and rolling back is deleting the route. Kept here as the record, and for the rollback.

**Already done:** Browser Cache TTL set to **Respect Existing Headers** (so a deploy isn't hidden behind a 4-hour browser cache); `privacy@` and `contact@` checked; the DNS records exported; `measure` kept out of search.

**Staying on, on purpose:**

- **Bot Fight Mode.** It protects `measure` (bots there cost Cloud Run requests and pollute analytics) and the `/api/*` endpoints. It can't be exempted on the free plan. Its JavaScript Detections add inline scripts to each page that no hash can allow (a loader at the end of the body, and the script it writes into a hidden frame); they're left refused by the CSP (nothing acts on their result on the free plan), their reports are dropped, and the browser console shows them as Report-Only violations (`src/lib/csp.ts`). It does challenge GitHub's runners, so the CD smoke test checks each deployed version through its preview address instead (see [after each deploy](#after-each-deploy)); Better Uptime gets through.
- **Cloudflare Web Analytics** (cookieless, in the privacy policy, allowed by the CSP).
- **Email Address Obfuscation** (its decode script loads from the site itself, which the CSP allows).

### the day before

1. Note the version that's **Live** in Tag Manager (**Admin → Environments**): it's the rollback target.
2. Open the launch pull request: the privacy policy's date set to the launch day, the home page's `noindex` and its exception in `lighthouserc.json` removed, the CD badge in the README. Review it on its preview.
3. Freeze WordPress edits, and hold Dependabot merges until the week after.
4. In Better Uptime, point the `harrisonjennings.au` monitor at `https://www.harrisonjennings.au/`, so it watches the site rather than the redirect.

### launch

1. **Merge the launch pull request.** Wait for the CI Orchestrator and Cloudflare's production deploy to go green. The site still isn't public.
2. **Add the route.** **Workers & Pages → harrisonjennings-au → Settings → Domains & Routes → Add → Route** (or the Worker's **Domains** tab): zone `harrisonjennings.au`, route `www.harrisonjennings.au/*`, failure mode **Fail closed** (the default: failing open would send visitors to WordPress mid-visit, and to nothing once it's retired) → **Add Route**.
3. **Bare domain to www.** WordPress does this today, so it has to move to Cloudflare: **Rules → Overview → Create rule → Redirect Rule**, built by hand (the only template is the opposite one, "Redirect from WWW to root"): name `Redirect from root to WWW`; custom filter expression, **Hostname** equals `harrisonjennings.au`; type **Dynamic**, expression `concat("https://www.harrisonjennings.au", http.request.uri.path)`, status 301, **Preserve query string** ticked → **Deploy**.
4. **Check.** `bash scripts/smoke-test.sh https://www.harrisonjennings.au` (every line ticks). In a private window: the cookie banner, accepting it, the booking calendar, a post, an old WordPress URL, the bare domain.
5. **Test the rollback, before Tag Manager.** Delete the route: WordPress serves. Add it again: the new site serves.
6. **Tag Manager.** **Versions** → the version on Testing → **Actions → Publish** (the Environments page has no publish option for Live). Check your own visit reaches the production GA4 property's Realtime report (the server container routes by the `environment` label, which should now read `Live`).
7. **GitHub.** Change the `PRODUCTION_LIVE` repository variable from `false` to `true`, then **Actions → 🚀 CD Orchestrator → Run workflow** (on `main`): the deployed version is smoke-tested, the live domain checked, and the first Production deployment recorded.
8. **Search Console.** **Sitemaps**: remove the five old WordPress sitemaps, submit `sitemap-index.xml`. **URL Inspection → Request indexing** for the home page, the blog, projects and each post. Run a live post through the Rich Results Test.
9. **Crawler Hints** on (**Caching → Configuration**). It works from cache misses, so it may rarely fire for pages the Worker serves; requesting indexing does the real work.
10. A GA4 annotation for the date, then share the posts and link them from their project sites.

### if it goes wrong (any time that week)

1. Delete the route: WordPress serves `www` again.
2. In Tag Manager, publish the version noted the day before back to **Live**: WordPress needs its Pressidium consent tag.
3. Change `PRODUCTION_LIVE` back to `false`.

The redirect rule can stay: WordPress redirects the bare domain the same way.

### the week after

Watch the CSP reports and the production consent log (D1), Search Console, Better Uptime and GA4. Then move to a Custom Domain, in Cloudflare's order: delete the `www` CNAME record, add `www` as a **Custom Domain** on the Worker (**Settings → Domains & Routes → Add → Custom Domain**), then delete the route. Then decommission (see the roadmap, and [DNS records](#dns-records)).

## DNS records

Audited on 20 October 2026 (Cloudflare zone `harrisonjennings.au`, free plan).

| record                                                  | points at                               | notes                                                                                                                                                                                                                                              |
| ------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `harrisonjennings.au` A, proxied                        | VentraIP (WordPress)                    | Until WordPress is retired. Then replace it with a proxied `AAAA 100::` placeholder, never just delete it: the bare-domain redirect rule needs a proxied record there                                                                              |
| `www` CNAME → apex, proxied                             | follows the apex                        | The Workers Route takes over at cutover; a week later the Worker's Custom Domain replaces this record                                                                                                                                              |
| `measure` AAAA `100::`, proxied                         | the `sgtm-proxy` Worker (Custom Domain) | Server-side Tag Manager. A response header transform rule ("measure: keep out of search") adds `X-Robots-Tag: noindex, nofollow` to everything it serves, so `ns.html` drops out of search (zone rules do apply to Worker Custom Domain responses) |
| MX ×2, SPF TXT, `sig1._domainkey` CNAME                 | iCloud                                  | Email. SPF authorises iCloud only                                                                                                                                                                                                                  |
| `_dmarc` TXT, `p=none`                                  | Cloudflare DMARC reports                | Monitoring only. After WordPress is retired and the reports show only iCloud, move to `p=quarantine`, later `p=reject` (iCloud passes: SPF and DKIM are both on this domain)                                                                       |
| `apple-domain` TXT                                      | Apple                                   | iCloud custom-domain verification                                                                                                                                                                                                                  |
| `google-site-verification` TXT                          | Google                                  | Search Console's proof of ownership: never delete it                                                                                                                                                                                               |
| `_github-pages-challenge-…` TXT                         | GitHub                                  | Stops anyone else claiming these subdomains on GitHub Pages                                                                                                                                                                                        |
| `mkto-ref` CNAME                                        | GitHub Pages                            | The Marketo API reference                                                                                                                                                                                                                          |
| `leadlens`, `git-playground` CNAMEs                     | Vercel                                  | Project sites, both in use                                                                                                                                                                                                                         |
| `status` CNAME                                          | Better Uptime                           | The status page, in use                                                                                                                                                                                                                            |
| `_cpanel-dcv-test-record` TXT, `default._domainkey` TXT | VentraIP                                | Hosting leftovers (control panel validation, its mail signing). Delete when the hosting is cancelled                                                                                                                                               |

**DNSSEC** (a quiet week after cutover): turn it on in Cloudflare (**DNS → Settings → DNSSEC**), which signs the zone and shows a DS record, then add that DS record in the domain's DNSSEC settings at the registrar. A wrong DS record takes the whole domain offline, email included, so do it when nothing else is changing. Cancelling the VentraIP hosting must leave the domain registration in place.

## by hand

`npm run deploy` builds and deploys from your machine with Wrangler, if you're logged in (`npx wrangler login`). Prefer pushing to `main`.
