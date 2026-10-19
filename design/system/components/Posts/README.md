"latest posts": the three newest posts.

**Markup:** `.hj-section__head` (title, "all posts" as `.hj-link--quiet.hj-desktop-only`, and the arrows), then `<div class="hj-posts hj-swipe" data-hj-swipe="posts">` with three `<article class="hj-post">`: `<time class="hj-post__date">`, `.hj-post__title` (a link), `.hj-post__desc`, and `.hj-tags` with one `.hj-tag` link. On phones "all posts" moves under the row (`.hj-section__after.hj-phone-only`).

- The excerpt is the post's `description` front matter (up to 180 characters), the same text used for its meta description. Not clamped: the schema keeps it short.
- One topic tag per card: the post's first topic.
- Title underline grows in from the left on hover (240ms) and the title turns `link`.
