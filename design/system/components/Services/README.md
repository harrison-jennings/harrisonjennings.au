"what I do": the three services, in one row on desktop and a swipe row on phones.

**Markup:** `<section class="hj-section">` with `.hj-section__head` (title, then `.hj-arrows` with `data-hj-prev="svc"` / `data-hj-next="svc"` buttons), then `<div class="hj-services hj-swipe" data-hj-swipe="svc">` holding one `<article class="hj-service">` per service: `.hj-service__name`, `.hj-service__desc`, and a `<ul class="hj-tools">` of three items.

- The three articles share their rows (CSS subgrid), so every tools line starts at the same height whatever the paragraphs above them run to.
- Tools are Martian Mono 12px in `muted`, each after a 4px brick dot and never split across lines; a wrapped line still starts with a dot.
- Phones: cards 84% wide with the next one peeking in, ‹ › arrows in the head; the arrows fade at the ends.
