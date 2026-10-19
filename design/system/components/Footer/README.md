The site footer: who, where to go, where else.

**Markup:** `<footer class="hj-footer">` with three `.hj-footer__col`: lockup (`<a class="hj-lockup hj-lockup--footer" data-hj-draw="view">`, which draws when the footer comes into view and again on hover) and `.hj-footer__tagline`; blog, projects, book a call; github and linkedin (`.hj-footer__social`, icon + word) and `<p class="hj-footer__legal">` (privacy, terms, cookie settings: separate links spaced 16px apart, no commas, each turning `link` on hover).

- `surface`, radius `radius-lg`, padding 36 × 40, three columns (1.4 / 1 / 1), one column under 760px.
- "cookie settings" reopens the consent preferences; it must stay in the footer on every page.
