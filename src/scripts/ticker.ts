// The testimonials row. It pauses on hover and focus (CSS); the pause button stops it outright
// (WCAG 2.2.2). Under reduced motion the row is still and scrolls by hand, so the button hides.
export function bindTicker(ticker: HTMLElement): void {
  const button = document.querySelector<HTMLButtonElement>(`[data-pause="${ticker.id}"]`);
  if (!button) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    button.hidden = true;
    return;
  }
  button.addEventListener('click', () => {
    const paused = ticker.dataset['paused'] !== 'true';
    ticker.dataset['paused'] = String(paused);
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', paused ? 'Play testimonials' : 'Pause testimonials');
  });
}
