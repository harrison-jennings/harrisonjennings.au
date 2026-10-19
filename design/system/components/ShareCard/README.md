Social share cards (Open Graph images): 1200 × 630, generated when the site builds, one per page. The mockups canvas has every variant at full size and at feed size.

**Every card:** `ground` (#121110) with the ember clouds top right (85% on home and project cards, 60% behind the text-heavy post and page cards); padding 72 / 80 / 64; the lockup bottom left (40px mark, 24px name); a detail bottom right in Martian Mono 20px `muted`. Dark only: share previews have no light mode.

- **Home** (and the default for any page without its own): "marketing, engineered." in Martian Mono 96 with the brick stop; under it "Strategy and the stack, from one person." in `text` and, on its own line, "Marketing technology consultant, Melbourne." in `muted`, 30px. Bottom right: harrisonjennings.au.
- **Post:** the main topic as "blog / {topic}" in Martian Mono 22 `link`; the title in Schibsted 600, 68px (60px when it's long), at most three lines then an ellipsis. Bottom right: the date.
- **Project:** "project", the name in Martian Mono 104, the summary at 30px, and the live host with its dot. Bottom right: harrisonjennings.au/projects.
- **Page** (blog, topic, projects, rss): the page title in Martian Mono 104 with the stop, its intro at 30px. Bottom right: the page's address.

**Build:** rendered at build time from each page's title, topic, date and summary in the brand fonts (e.g. Satori via astro-og-canvas or a small build script) to /og/<path>.png, referenced by `og:image` and `twitter:image`. A post's `socialImage` front matter replaces its card.
