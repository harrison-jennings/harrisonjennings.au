The colour roles in both themes, with the contrast of every pairing that carries text.

Use the tokens by role, never by hex: `ground`, `surface`, `line`, `text`, `muted`, `accent`, `on-accent`, `link`, `apricot`, `on-apricot`.

- Read text in `text` or `muted` on `ground` or `surface`.
- `accent` as text only on dark `ground` (4.53:1), or anywhere in light. On dark `surface` it is 4.16:1: use `link` for small text there; `accent` is still fine for underlines, dots and fills.
- Fills: `accent` with `on-accent`; `apricot` with `on-apricot`. Never white on the dark-theme brick.
- `line` is decorative (1.2–1.3:1). Don't rely on it alone to mark a control.
