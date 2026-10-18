# deployment

The site deploys from GitHub to Cloudflare with [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).

| branch        | goes to                                                |
| ------------- | ------------------------------------------------------ |
| `main`        | production: www.harrisonjennings.au                    |
| anything else | a preview URL on workers.dev, behind Cloudflare Access |

## one-time setup in Cloudflare

1. **Workers & Pages → Create → Import a repository.** Pick `harrison-jennings/harrisonjennings.au`.
2. **Build settings.**
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Non-production branch deploy command: `npx wrangler versions upload`
   - Root directory: `/`
   - Variable `NODE_VERSION` = `22` if the build image doesn't pick up `.nvmrc`.
3. **Branch builds.** Turn on builds for non-production branches, so every branch gets a preview URL.
4. **Lock the previews.** In the Worker's **Settings → Domains & Routes**, enable Cloudflare Access for workers.dev and preview URLs, and allow only your own email.
5. **Check a preview.** Push a branch, open its preview URL, sign in through Access.

## cutover (around 4 November)

1. Lower the TTL on the `www` DNS record a day ahead.
2. Add a **Workers Route** `www.harrisonjennings.au/*` to the Worker. The route takes over from the WordPress origin without touching DNS, so rolling back is just deleting the route.
3. Add a **redirect rule**: `harrisonjennings.au/*` → `https://www.harrisonjennings.au/${1}` (301), so the bare domain always lands on www.
4. Check: home, a post, /projects/, a 404, the security headers (`curl -I`), and the old URLs you care about.
5. Keep the route for about a week as the rollback path. Then replace it with a **Custom Domain** on the Worker and retire the WordPress hosting before it renews on 11 November.

Leave these DNS records alone: iCloud mail (MX, SPF, DKIM), `measure.` (server-side GTM) and the project subdomains.

## by hand

`npm run deploy` builds and deploys from your machine with Wrangler, if you're logged in (`npx wrangler login`). Prefer pushing to `main`.
