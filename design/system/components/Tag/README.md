A small outlined chip for a topic, such as a post's category.

**Markup:** `<span class="hj-tag">marketing automation</span>`; make it an `<a>` when it links to a topic page.

- 12px Schibsted Grotesk, `text` on transparent with a `line` outline, pill radius.
- Lowercase. Keep to one to three per item.
- **Topic without a page** (`.hj-tag--label`, a `<span>`): dashed outline, `muted` text. A topic gets its own page once two posts use it; until then its tag is a label, not a link.
- On cards and the post header, the first topic listed in the post is its main topic.
