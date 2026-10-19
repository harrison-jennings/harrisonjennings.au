// Arrow buttons for a row that swipes sideways on phones. The row is [data-swipe="key"]; its buttons
// are [data-swipe-prev="key"] and [data-swipe-next="key"]. Each press moves one card. At the end of
// the row an arrow is marked aria-disabled (and fades), not removed, so focus never jumps.
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function bindSwipe(row: HTMLElement): void {
  const key = row.dataset['swipe'];
  const prev = document.querySelector<HTMLButtonElement>(`[data-swipe-prev="${key}"]`);
  const next = document.querySelector<HTMLButtonElement>(`[data-swipe-next="${key}"]`);

  const step = (dir: 1 | -1) => {
    const card = row.firstElementChild as HTMLElement | null;
    if (!card) return;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    row.scrollBy({
      left: dir * (card.offsetWidth + gap),
      behavior: reducedMotion() ? 'auto' : 'smooth',
    });
  };
  const hasFocusable = !!row.querySelector('a[href], button, input, [tabindex]');
  const update = () => {
    const max = row.scrollWidth - row.clientWidth;
    if (!hasFocusable) {
      const scrolls = max > 4;
      row.toggleAttribute('tabindex', scrolls);
      if (scrolls) {
        row.tabIndex = 0;
        row.setAttribute('role', 'region');
        row.setAttribute('aria-label', row.dataset['swipeLabel'] ?? '');
      } else {
        row.removeAttribute('role');
        row.removeAttribute('aria-label');
      }
    }
    prev?.setAttribute('aria-disabled', String(row.scrollLeft <= 4));
    next?.setAttribute('aria-disabled', String(row.scrollLeft >= max - 4));
  };

  prev?.addEventListener('click', () => prev.getAttribute('aria-disabled') !== 'true' && step(-1));
  next?.addEventListener('click', () => next.getAttribute('aria-disabled') !== 'true' && step(1));
  let queued = false;
  row.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        update();
      });
    },
    { passive: true },
  );
  window.addEventListener('resize', update);
  update();
}
