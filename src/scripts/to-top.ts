// "back to top" on a post: it shows once the reader is a screen down, and its ring fills from the
// start of the post's text to its end. It scrolls to the top (at once under reduced motion) and moves
// focus to the post's title, so the next Tab carries on from there.
export function bindToTop(
  button: HTMLButtonElement,
  text: HTMLElement,
  title: HTMLElement | null,
): void {
  const fill = button.querySelector<SVGElement>('[data-to-top-fill]');
  let queued = false;
  const update = () => {
    queued = false;
    const box = text.getBoundingClientRect();
    const span = box.height - window.innerHeight;
    const read = span > 0 ? Math.min(1, Math.max(0, -box.top / span)) : 1;
    fill?.style.setProperty('stroke-dashoffset', String(1 - read));
    button.toggleAttribute('data-shown', window.scrollY > window.innerHeight);
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  button.addEventListener('click', () => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: still ? 'instant' : 'smooth' });
    if (title) {
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
    }
  });
  update();
}
