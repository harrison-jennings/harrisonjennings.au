The solid pill button. Apricot wipes across it on hover, entering from the side the pointer comes in and leaving the side it goes out.

**Markup:** `<a class="hj-btn" href="…"><span>book a call</span><span class="hj-btn__wipe" aria-hidden="true">book a call</span></a>`. The wipe layer repeats the label so the text colour can change under the wipe. `HJ.init()` attaches the direction-aware behaviour; without script the wipe still runs from the left on `:hover`.

**Sizes:** default 18px (17 × 30), `.hj-btn--l` 20px (20 × 36), `.hj-btn--s` 15px (12 × 20, expanded nav), `.hj-btn--xs` 14px (10 × 16, compact nav), `.hj-btn--block` 16px full width (mobile menu).

**The consumer provides:** the label (twice) and the href. Use `<button class="hj-btn">` with the same children for in-page actions.

- Rest: `accent` fill, `on-accent` text (dark: #121110 on #c85a52; light: white on #a8443d).
- Hover: `apricot` fill, `on-apricot` text, wiped in over 360ms with a cubic ease. Phones play it once on tap. Keyboard focus wipes it in and shows the focus ring.
- One primary button per view. No outline, ghost or gradient variants: the rejected ring, glow, deepen, nudge, ember-edge and bloom treatments stay out.
- State classes for mockups: `.is-wiping` (part-way), `.is-hover` (full).
