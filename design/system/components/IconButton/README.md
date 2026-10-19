Round icon-only links for the two platforms, GitHub and LinkedIn.

**Markup:** `<a class="hj-icon-btn" href="…" aria-label="GitHub profile"><svg …><path d="…"/></svg></a>`; group them in `.hj-icons`. `.hj-icon-btn--lg` is the 48px version for the mobile menu (no outline). `.hj-icon-btn--outline` adds a `line` ring and is only for the menu and close buttons.

**The consumer provides:** the profile URL and the aria-label; the glyph comes from the Icons asset group, inlined so it can use `currentColor`.

- Rest: `text`. Hover and focus: `link`. 44px target (48px in the mobile menu).
- Only these two platforms; don't add others without a design decision.
