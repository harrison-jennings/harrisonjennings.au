The path mark (a lowercase h drawn as one line, ending in a brick dot) and its lockup with the name.

**Markup:** `HJ.markSvg(size, { label })` returns `<svg class="hj-mark">` with the right stroke and dot for the size. Lockups: `<a class="hj-lockup">` (17px name), `.hj-lockup--l` (24px), `.hj-lockup--footer` (20px), each containing the mark and the text "harrison jennings".

**The consumer provides:** the size, and a `label` only when the mark stands alone (otherwise it is decorative beside the name).

- Stroke uses `text`, dot uses `accent`; both switch with the theme.
- Weights: 40px+ stroke 11 / dot 7.5; 26–28px 12 / 8.5; 24px 15 / 9.5; 13px 17 / 10.5; the 64px favicon tile uses 13 / 8.5 at 46px.
- Static files for places without the tokens (social cards, favicons) are in the Logos asset group.
- Don't recolour the line, swap the dot for apricot or a gradient, set the name in Martian Mono, or add a frame other than the favicon tile.
