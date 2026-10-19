// Adds .is-compact once the page scrolls past the threshold. Hovering doesn't open it back up (that
// would move the links out from under the pointer); keyboard focus does, so the GitHub and LinkedIn
// icons the compact bar hides stay reachable by Tab.
export function bindNav(nav: HTMLElement, threshold = 80): void {
  let keyboard = false;
  const update = () => nav.classList.toggle('is-compact', window.scrollY > threshold && !keyboard);
  window.addEventListener('scroll', update, { passive: true });
  nav.addEventListener('focusin', (e) => {
    keyboard = (e.target as Element).matches(':focus-visible');
    update();
  });
  nav.addEventListener('focusout', (e) => {
    if (!nav.contains(e.relatedTarget as Node | null)) {
      keyboard = false;
      update();
    }
  });
  update();
}
