A blog post (/blog/<slug>/).

**Header** (`.hj-posthead`): `.hj-eyebrow` "blog / {main topic}", `.hj-posthead__title` (`title-xl`, Schibsted 600 46px, 32px on phones), `.hj-posthead__dek` (`dek`: the post's description), `.hj-posthead__meta` ("13 August 2026, 6 min read" + the topic tags). An optional `.hj-cover` image follows.

**Body** (`.hj-article`): a 680px `.hj-prose` column and, on desktop, `.hj-toc` "on this page" beside it. After the text: `.hj-postend` (published / updated dates, "back to all posts"), then `.hj-author`, then "keep reading", then the footer. No booking band.

**Rules the build follows:**
- **Main topic** = the first topic in the post's list. It shows in the eyebrow and as the single tag on the post's cards elsewhere.
- **Reading time** is worked out at build: prose words ÷ 230, rounded up, at least 1 minute; code blocks don't count.
- **On this page** lists the h2s and, indented, the h3s. It stays in view as the reader scrolls and marks the section being read (`HJ.toc`). Hidden on posts with fewer than three h2s, or with `toc: false`. On phones it becomes a closed "on this page" panel above the text.
- **Keep reading**: three posts, the ones sharing the most topics with this one, newest first on a tie, topped up with the latest posts; a post can hand-pick them with `related:` in its front matter. Cards as on the home page; on phones a swipe row with arrows.
- **Author panel**: the mark, "written by harrison jennings", a one-line bio, and github and linkedin links (icon + word).
