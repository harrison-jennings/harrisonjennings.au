The booking band at the foot of the home page.

**Markup:** `<div class="hj-book">` with `.hj-book__text` (`.hj-book__title` "ready to jump in? book a call" + `.hj-book__stop`, and `.hj-book__note`), `.hj-book__actions` (a `.hj-btn` with `data-hj-book-toggle`, `aria-expanded` and `aria-controls`, its labels marked `data-hj-label`; then `.hj-book__alt` "or say hello on linkedin") and `<div class="hj-book__cal" hidden>` for the calendar.

- The button opens the calendar inside the band and switches its label to "hide availability". The first time it opens, the band fires `hj:book-open`; load the Cal.com embed then and not before, so nothing from Cal.com runs until someone asks for it.
- While the embed loads, show the logo with the bouncing dot (`.hj-mark--loading`).
- The note's call length is still to be confirmed.
- Phones: the band stacks, the button goes full width, the LinkedIn line centres under it.
