Everything inside a post, styled by wrapping the rendered Markdown in `.hj-prose`. The "formatting reference" board on the mockups canvas shows each one with the Markdown that makes it.

- **Headings:** the h1 is the post title (once). `##` h2 26px, `###` h3 20px, `####` h4 17px, all Schibsted 600. Three levels under the title is the ceiling: h5 and h6 render as h4.
- **Text:** `prose` 17 / 1.7, measure 680px; paragraphs 1.15em apart. Bold 600, italic, links underlined in `accent`, inline code (see Code block).
- **Lists:** bullets in `accent`; numbers in Martian Mono 13px `muted`; nested lists indent once.
- **Quote:** `>` gets a 2px `accent` rule and 20px type (18 on phones).
- **Callouts:** `.hj-callout` on `surface`, radius 14: `:::note` (muted label), `:::tip` (link label), `:::warning` "heads up" (adds a 2px `accent` edge).
- **Images keep their own shape:** nothing is cropped to a fixed ratio. A landscape or square image fills the column's width. A portrait image is capped at 560px tall (480 on phones), centred in the column, so it never fills the screen; a phone screenshot reads best this way or in a two- or three-up row.
- **Every image opens the image viewer** when clicked (see Image viewer): full screen, zoom to 400%, drag to move.
- **Layouts:** one across the column, `<Figures cols={2}>` two side by side, `<Figures cols={3}>` three across; each with an optional caption in 14px `muted`. Two- and three-up stack on phones. Images never run wider than the text column while "on this page" is shown; a post with `toc: false` may also use a full-width image.
- **Tables:** `.hj-table` in a framed, sideways-scrolling wrapper; headers in Martian Mono 11.5px `muted` on `surface`; numbers right-aligned in Martian Mono (`.hj-num`).
- **Video:** `<YouTube id="…" />` shows a still frame and a brick play button; nothing loads from YouTube until it is pressed.
- **Details:** `<details>` with a 48px summary row, closed by default, for long scripts or asides.
- **Footnotes:** `[^1]` references in Martian Mono; notes collect under a hairline at the end.
- **Divider:** `---` becomes three brick dots.
