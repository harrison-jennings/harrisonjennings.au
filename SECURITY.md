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

- Static output only: no server-side code runs for page requests, and there are no logins or forms that store data.
- Security headers are set in `public/_headers`.
- Dependencies are watched by Dependabot, and CI must pass before anything reaches `main`.
- No secrets live in the repository. Cloudflare credentials stay in Cloudflare; local values go in `.dev.vars`, which is ignored.
