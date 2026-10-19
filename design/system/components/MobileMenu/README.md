The full-screen menu on phones.

**Markup:** `<div class="hj-menu" role="dialog" aria-modal="true" aria-label="Menu">` containing `.hj-menu__top` (the lockup and an outlined close button, `.hj-icon-btn--outline`), `.hj-menu__links`, a `.hj-btn--block` "book a call", and `.hj-menu__social` with two `.hj-icon-btn--lg` (plain, no outline).

- Fills the viewport in `ground`. The top row sits exactly where the bar was, so the close button replaces the menu button under the thumb.
- Links in Martian Mono 30px, -0.05em, gap 14; the current page underlined in brick (2px, 8px offset).
- GitHub and LinkedIn are plain 48px icons with aria-labels, lined up with the links.
- On open, move focus to the first link; Escape and the close button close it and return focus to the menu button. Any link closes it.
