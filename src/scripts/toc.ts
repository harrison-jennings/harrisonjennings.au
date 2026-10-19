// "on this page" marks the section being read: the last heading whose top has passed 140px.
export function bindToc(nav: HTMLElement): void {
  const links = [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const heads = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))));
  let queued = false;
  const update = () => {
    queued = false;
    let current = 0;
    heads.forEach((h, i) => {
      if (h && h.getBoundingClientRect().top <= 140) current = i;
    });
    links.forEach((a, i) => a.setAttribute('aria-current', String(i === current)));
  };
  window.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}
