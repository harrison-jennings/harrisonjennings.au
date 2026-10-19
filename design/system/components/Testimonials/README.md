"what people are saying": testimonial cards drifting in a row across the full page width.

**Markup:** a `.hj-section__head` with the title and `<button class="hj-pause" data-hj-pause="{ticker id}" aria-pressed="false" aria-label="Pause testimonials">` (holding `.hj-pause__bars` and `.hj-pause__play` icons), then `<div class="hj-ticker" id="…" data-paused="false"><div class="hj-ticker__track">` with every `<figure class="hj-quote">` twice: the second set `aria-hidden="true"` so the loop is seamless and screen readers hear each once.

**Each quote:** `<blockquote>` (up to 280 characters), `.hj-quote__name`, `.hj-quote__role` ("Marketing Director, Renault Australia").

- 80s loop (`--hj-tick-duration` to change); pauses on hover and focus; the button stops it outright (WCAG 2.2.2).
- Cards are 420px (300 on phones) and stretch to the tallest, so names line up.
- Needs five or more quotes. With fewer, don't use the ticker: lay the cards out still, side by side.
- Reduced motion: no drift, the row scrolls by hand, the pause button hides.
- Title is "what people are saying", never "what clients say".
