Three approved motions for the mark: the draw, the bounce and the signal.

- **Draw** (`data-hj-draw` on the lockup or mark, or `HJ.draw(svg)`): the dot runs 16 units ahead of the line, down the stem, back up, round the arch and down the leg, then settles at the foot. About 2s, ease-in-out. Plays once on load and again on hover of the logo. `HJ.draw(svg, { loop: true })` repeats it on the 3.4s demo cycle.
- **Bounce** (`.hj-mark--loading`): the dot squashes and bounces, 1s loop. Only while something is loading (the booking calendar, the 404 page). Give the loader a text label beside it ("loading the booking calendar").
- **Signal** (`.hj-mark--signal`, mark built with `{ signal: true }`): a ring expands from the dot and fades over 1.8s. Its small form is the live dot (see LiveSignal).
- Under reduced motion all three are still: the mark appears drawn, the dot sits at rest.
- Never run more than one of these at once on a screen, and never loop the draw on the live site.
