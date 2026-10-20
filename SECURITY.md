# Security policy

## Reporting a vulnerability

Please don't open a public issue. Report it privately through
[GitHub's private vulnerability reporting](https://github.com/harrison-jennings/harrisonjennings.au/security/advisories/new),
with the affected URL, what you found and how to reproduce it.

You'll get an acknowledgement within five working days. Once it's fixed, you're welcome to be credited in the advisory.

## Scope

- www.harrisonjennings.au and this repository's code and configuration.
- Out of scope: the separately hosted project subdomains (each has its own repository), third-party services the site links to or embeds (Cal.com, Google Tag Manager), and findings that need physical access, social engineering or denial of service.

## How the site is hardened

- Pages and assets are static files: no server-side code runs for them, and there are no logins or general-purpose forms.
- Two narrow Worker endpoints accept POSTs and store records in Cloudflare D1: `/api/consent` (a cookie choice) and `/api/csp-report` (Content-Security-Policy violation reports). Each caps the body size, checks every field, and uses parameterised SQL; a Cloudflare rate-limiting rule covers `/api/*`. The IP address behind a consent record is stored only as a keyed hash.
- Security headers are set in `public/_headers`; the Content-Security-Policy, with hashes for the inline scripts, is added at build (`src/lib/csp-build.ts`).
- Dependencies are watched by Dependabot, and CI must pass before anything reaches `main`.
- No secrets live in the repository. Cloudflare credentials stay in Cloudflare; local values go in `.dev.vars`, which is ignored.
