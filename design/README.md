# design

Everything approved in the design phase (18–19 October 2026), copied out of the design system and mockups artifacts so the build can read it. Treat this folder as reference: the site's own source lives in `src/`.

| Path | What it is |
| --- | --- |
| `tokens.json` | The repo's token source, read by `scripts/build-tokens.mjs`. Replace it with `system/tokens.json` (see BUILD-BRIEF.md). |
| `system/README.md` | The design system: voice, colour, theme, type, motion, components, layout, accessibility. **Start here.** |
| `system/tokens.json` | Every token, both themes. |
| `system/components/<Name>/README.md` | One note per component: markup, behaviour, phone layout, edge cases. |
| `system/components/<Name>/preview.html` | A working example of each component (needs `bundle.css`, `bundle.js` and the tokens as CSS variables). |
| `system/components/bundle.css` | Reference CSS for every component, `hj-` prefixed, reading only tokens. |
| `system/components/bundle.js` | Reference behaviours (`window.HJ`): theme toggle, logo draw, hero field, nav, button wipe, swipe rows, project switcher, testimonial ticker, booking band, on-this-page tracking, code copy, image viewer, copy buttons. |
| `system/fonts/`, `system/licenses/` | Martian Mono and Schibsted Grotesk (variable woff) and their OFL licences. |
| `mockups/screenshots/` | Every approved page, desktop (1440) and phone (390), rendered with the real fonts. Light-mode shots of the hero, home sections and a post. |
| `mockups/source/` | The approved mockup boards. They need the design tool to run, but the CSS inside them is exact: open one as text when a value isn't in the design system. |

When the design system and a mockup disagree, the design system wins: it was updated with every approval.

## Screenshot index

| File | Page | Route |
| --- | --- | --- |
| 01-home-hero | Home, first screen | `/` |
| 02-home-sections | Home, everything under the hero | `/` |
| 03-blog-index | Blog index | `/blog/` |
| 04-topic-page | Topic page | `/blog/topic/<id>/` |
| 05-post | Post | `/blog/<slug>/` |
| 06-formatting-reference | Every element a post can contain | not published (style guide later) |
| 07-image-viewer | Image viewer, open | any post image |
| 08-projects | Projects | `/projects/` |
| 09-rss | RSS page | `/rss/` |
| 10-privacy, 11-terms | Legal pages | `/privacy-policy/`, `/terms-of-use/` |
| 12-404 | Not found | any missing URL |
| 13-share-cards | Social share images | `/og/…png` |
