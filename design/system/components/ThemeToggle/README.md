The sun/moon switch between dark and light, in the nav.

**Markup:** `<button class="hj-icon-btn hj-theme" type="button" data-hj-theme aria-label="Switch to light mode">` holding two inline SVGs, `.hj-theme__sun` (a circle with eight short rays) and `.hj-theme__moon` (a crescent), both 20px on the 24-unit grid with a 2px round stroke. `HJ.init()` wires it; `HJ.setTheme()` does the switch.

- Shows the current theme: a moon in dark, a sun in light. The aria-label says the action ("Switch to light mode" while dark) and is updated on every switch.
- On switch the outgoing icon turns a quarter and fades as the other arrives (320ms); instant under reduced motion.
- Dark on every first visit; the choice is saved in `localStorage` (`hj-theme`). Pair it with the inline head script in the README so the saved theme applies before first paint.
- Sits after the page links in the nav; on phones it stays in the bar beside the menu button.
