// Adds .is-compact once the page scrolls past the threshold; hover or focus opens the bar back up.
export function bindNav(nav: HTMLElement, threshold = 80): void {
  let engaged = false;
  const update = () => nav.classList.toggle('is-compact', window.scrollY > threshold && !engaged);
  const set = (value: boolean) => () => {
    engaged = value;
    update();
  };
  window.addEventListener('scroll', update, { passive: true });
  nav.addEventListener('pointerenter', set(true));
  nav.addEventListener('pointerleave', set(false));
  nav.addEventListener('focusin', set(true));
  nav.addEventListener('focusout', set(false));
  update();
}
