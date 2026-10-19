Code in posts: Martian Mono 12.5 / 1.7 on `surface` in a hairline frame, with a bar above for the language (and file name) and a copy button.

**Markup:** `<div class="hj-codeblock">` with `.hj-codeblock__bar` (`.hj-codeblock__file` when there is one, the language, and `<button class="hj-codeblock__copy">copy</button>`), then `<pre><code>` holding one `<span class="line">` per line. Highlighted lines add `.highlighted`.

**Writing it in Markdown:**
- ```` ```js ```` — the language after the fence sets the highlighting and the label. Nothing is guessed; no language = plain text.
- ```` ```js title="src/scripts/booking.js" ```` — adds the file name.
- ```` ```vtl {2-3} ```` — highlights lines 2 to 3: a `code-highlight` band with a 2px `accent` edge. For pointing at the lines the text discusses; most blocks don't use it.
- ```` ```sh ```` — terminal commands; the `$` prompt (`.hj-tk-prompt`) is muted and left out of the copy.

**Syntax colours** (build-time highlighting, mapped to tokens; everything else stays `text`):
- `.hj-tk-keyword` → `code-keyword` (brick; the lighter link brick in dark)
- `.hj-tk-string` → `code-string` (apricot in dark, deep amber in light)
- `.hj-tk-number` → `code-number` (sand)
- `.hj-tk-comment` → `muted`
All pass AA on `surface` in both themes.

- Long lines never wrap: the block scrolls sideways. On phones it runs edge to edge and fades at the right edge to show there is more.
- Inline code (`` `like this` ``): Martian Mono at 0.8em on `surface` with a `line` outline, radius 6.
- `HJ.copyCode` wires the copy button: "copied" for 1.6s.
- Each line is its own element so line breaks never depend on whitespace in the markup.
