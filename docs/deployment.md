# deployment

The site deploys from GitHub to Cloudflare with [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).

| branch        | goes to                                            |
| ------------- | -------------------------------------------------- |
| `main`        | production: www.harrisonjennings.au                |
| anything else | a Preview on workers.dev, behind Cloudflare Access |

The Worker is `harrisonjennings-au`, on the `harrisonjennings-au.workers.dev` subdomain. A branch's Preview URL is `<branch>-harrisonjennings-au.harrisonjennings-au.workers.dev` (slashes become hyphens: `chore/tests` → `chore-tests-…`), and Cloudflare comments it on the pull request. The production workers.dev URL is off (`workers_dev: false`); production is reached only through the www route from cutover.

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
3. **The IP hashing key**: the Worker's **Settings → Variables and secrets → Add → Secret**, `CONSENT_IP_KEY`, a long random value (`openssl rand -hex 32`). Keep a copy in your password manager: without it, a stored hash can't be checked against an IP. Never change it unless you mean to: rows hashed with the old key stop matching.

**Previews** don't inherit production bindings, so they write to their own database, `harrisonjennings-consent-preview` (`previews.d1_databases` in `wrangler.jsonc`), and test clicks never reach the production log. Create or update its table with `npx wrangler d1 migrations apply CONSENT_DB --remote -c wrangler.preview-migrations.jsonc`. Previews have no `CONSENT_IP_KEY`, so their rows store no IP hash.

To look someone up, run a query in the database's **Console** tab, e.g. `SELECT * FROM consent_log WHERE consent_id = '…' ORDER BY created_at`. Rows from previews have `environment = 'preview'`.

## cutover (around 4 November)

1. Lower the TTL on the `www` DNS record a day ahead.
2. Add a **Workers Route** `www.harrisonjennings.au/*` to the Worker. The route takes over from the WordPress origin without touching DNS, so rolling back is just deleting the route.
3. Add a **redirect rule**: `harrisonjennings.au/*` → `https://www.harrisonjennings.au/${1}` (301), so the bare domain always lands on www.
4. Check: home, a post, /projects/, a 404, the security headers (`curl -I`), and the old URLs you care about.
5. Keep the route for about a week as the rollback path. Then replace it with a **Custom Domain** on the Worker and retire the WordPress hosting before it renews on 11 November.

Leave these DNS records alone: iCloud mail (MX, SPF, DKIM), `measure.` (server-side GTM) and the project subdomains.

## by hand

`npm run deploy` builds and deploys from your machine with Wrangler, if you're logged in (`npx wrangler login`). Prefer pushing to `main`.
