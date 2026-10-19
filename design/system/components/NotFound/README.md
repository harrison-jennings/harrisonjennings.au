The 404 page: the one inner page with ember atmosphere, and the one place the bouncing dot loops.

- `.hj-404` fills the screen (`100svh`) above the footer, with `.hj-ember-clouds` behind (70%, fading out towards the bottom so it never meets the footer as an edge).
- Left: `.hj-404__code` "404" in `link`, `.hj-404__title` "this page has moved on." (Martian Mono, brick stop), `.hj-404__sub`, then `.hj-404__actions` ("read the blog" link, "go home" button), then `.hj-404__more` with the three latest posts.
- Right: the mark at 220px with `.hj-mark--loading`, the dot bouncing at the foot of the leg. The mark lets its contents overflow, so the dot's lowest point is never clipped. On phones it sits above the text at 96px; the buttons stack with "go home" full width.
- Reduced motion: the dot rests.
- Wording is a draft, editable in `src/pages/404.astro`'s content block.
