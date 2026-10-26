# design system

The source for **[design.harrisonjennings.au](https://design.harrisonjennings.au/)**: the brand, every component, every element a post can hold, every token and every kind of page on harrisonjennings.au.

The site's design language and brand identity are its own, not an off-the-shelf theme or template, and this is where they're written down. It imports the site's own components, styles, tokens and Markdown pipeline from `../src/`, so it shows exactly what's live, and most of what it says is read from the code rather than typed in.

```sh
npm run design:dev       # from the repository root: http://localhost:4322
```

How it's built, kept current and deployed: [docs/design-system.md](../docs/design-system.md).
