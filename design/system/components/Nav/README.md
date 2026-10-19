The floating pill navigation, full at the top of the page and compact after scrolling.

**Markup:** `<nav class="hj-nav" data-hj-nav>` containing `.hj-nav__brand` (mark + `.hj-nav__name`, with `data-hj-draw`), `.hj-nav__links` (home, blog, projects; `aria-current="page"` on the current one), the theme toggle (`.hj-icon-btn.hj-theme` with `data-hj-theme`, see ThemeToggle), `.hj-nav__icons` (two icon buttons), a `.hj-btn--s` "book a call", and `.hj-nav__menu` (an outlined icon button, shown under 760px). Wrap it in `.hj-shell` so it shares the page's column.

- `ground` with a `line` border, pill radius, padding 10 / 10 / 10 / 22.
- Links 15px `text`. On hover or focus a 1.5px brick underline grows in from the left (240ms); the current page keeps it. The text colour doesn't change.
- After 80px of scroll `data-hj-nav` adds `.is-compact`: the name and icons drop away, links go to 14px, the button to `.hj-btn--xs`. Hover or focus opens it back up.
- Under 760px the bar shows the logo and name (15px), the theme toggle and the menu button, which opens the mobile menu.
