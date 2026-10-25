# Contributing

This is a personal site, so most changes come from its owner. Corrections are welcome though:

- **Typos, broken links, out-of-date details:** open a [content correction](../../issues/new?template=content.yml).
- **Something broken:** open a [bug report](../../issues/new?template=bug_report.yml), with the page and browser.
- **Security issues:** report them privately; see [SECURITY.md](SECURITY.md).

Please open an issue before a pull request for anything beyond a small fix.

## Working on the code

1. Use Node 24 LTS (`nvm use`); Node 22.22 or newer still works.
2. `npm ci`, then `npm run dev`.
3. Branch from `main`: `fix/…`, `feat/…`, `content/…`, `chore/…`.
4. Before pushing, run `npm run verify` (the first time, run `npx playwright install chromium webkit` for the end-to-end tests).
5. Open a pull request using the template. Pull requests are squash-merged, so the title becomes the commit message: write it in the imperative ("Add projects index"), and use a [Conventional Commits](https://www.conventionalcommits.org/) prefix where it fits (`feat:`, `fix:`, `content:`, `chore:`, `docs:`).

## House rules

- Every colour, size and radius comes from `design/tokens.json`. No new hex values in components.
- UI copy is lowercase; body copy is sentence case. See [docs/brand.md](docs/brand.md).
- Keep pages static. Anything that needs a server is a design decision first: see [docs/architecture.md](docs/architecture.md).
- Accessibility isn't optional: keyboard access, visible focus, 4.5:1 text contrast and a still state under reduced motion.
