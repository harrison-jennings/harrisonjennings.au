// The image viewer. Every [data-zoomable] image in a post opens it, full screen: zoom from fit to
// 400% (wheel, + and −, pinch; a click on the image goes to 200% and back), drag to move within the
// image's edges, step through the post's images, close with Esc, the close button, a click on the
// empty backdrop or a swipe down.
// A modal dialog: focus moves to close on open, Tab stays inside, focus returns to the image.
// The largest available file (from the image's srcset) loads only when the viewer opens.

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const icon = (d: string) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"></path></svg>`;
const ICONS = {
  close: 'M6 6l12 12M18 6L6 18',
  prev: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  out: 'M5 12h14',
  in: 'M12 5v14M5 12h14',
  fit: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
};

const MARKUP = `
<div class="lightbox__top">
  <span data-count></span>
  <span class="lightbox__hint" data-hint></span>
  <button class="lightbox__btn" type="button" data-close aria-label="Close">${icon(ICONS.close)}</button>
</div>
<div class="lightbox__stage is-fit" data-stage>
  <button class="lightbox__btn lightbox__side lightbox__side--prev" type="button" data-prev aria-label="Previous image">${icon(ICONS.prev)}</button>
  <div class="lightbox__img" data-img></div>
  <button class="lightbox__btn lightbox__side lightbox__side--next" type="button" data-next aria-label="Next image">${icon(ICONS.next)}</button>
</div>
<div class="lightbox__foot">
  <p class="lightbox__cap" data-cap></p>
  <div class="lightbox__bar" role="toolbar" aria-label="Image controls">
    <button class="lightbox__btn lightbox__phone" type="button" data-prev aria-label="Previous image">${icon(ICONS.prev)}</button>
    <span class="lightbox__sep lightbox__phone" aria-hidden="true"></span>
    <button class="lightbox__btn" type="button" data-out aria-label="Zoom out">${icon(ICONS.out)}</button>
    <span class="lightbox__level" data-level aria-live="polite">fit</span>
    <button class="lightbox__btn" type="button" data-in aria-label="Zoom in">${icon(ICONS.in)}</button>
    <span class="lightbox__sep" aria-hidden="true"></span>
    <button class="lightbox__btn" type="button" data-fit aria-label="Fit to screen" title="Fit to screen">${icon(ICONS.fit)}</button>
    <span class="lightbox__sep lightbox__phone" aria-hidden="true"></span>
    <button class="lightbox__btn lightbox__phone" type="button" data-next aria-label="Next image">${icon(ICONS.next)}</button>
  </div>
</div>`;

/** The largest file in an image's srcset (the viewer shows that one), or its own src. */
export function largestSource(img: HTMLImageElement): string {
  const candidates = (img.getAttribute('srcset') ?? '')
    .split(',')
    .map((c) => c.trim().split(/\s+/))
    .filter(([url]) => url)
    .map(([url, size]) => ({ url: url!, width: parseFloat(size ?? '') || 0 }));
  if (!candidates.length) return img.currentSrc || img.src;
  return candidates.reduce((a, b) => (b.width > a.width ? b : a)).url;
}

export function bindLightbox(buttons: HTMLButtonElement[]): void {
  if (!buttons.length) return;
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = MARKUP;
  document.body.append(box);

  const q = <T extends Element>(s: string) => box.querySelector<T>(s)!;
  const qa = <T extends Element>(s: string) => [...box.querySelectorAll<T>(s)];
  const stage = q<HTMLElement>('[data-stage]');
  const holder = q<HTMLElement>('[data-img]');
  const hint = q<HTMLElement>('[data-hint]');
  const st = { i: 0, z: 1, tx: 0, ty: 0 };
  let opener: HTMLElement | null = null;
  let hintTimer = 0;
  const pointers = new Map<number, [number, number]>();
  let start: { x: number; y: number; tx: number; ty: number } | null = null;
  let pinch: { d: number; z: number } | null = null;
  let moved = false; // the last press dragged, swiped or pinched, so its click isn't a click
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const fitted = () => st.z <= 1.001;

  const apply = (animate = true) => {
    holder.style.transition = animate && !reducedMotion() ? '' : 'none';
    holder.style.transform = `translate(${st.tx}px,${st.ty}px) scale(${st.z})`;
    q('[data-level]').textContent = fitted() ? 'fit' : `${Math.round(st.z * 100)}%`;
    q('[data-out]').setAttribute('aria-disabled', String(fitted()));
    q('[data-fit]').setAttribute('aria-disabled', String(fitted()));
    q('[data-in]').setAttribute('aria-disabled', String(st.z >= 3.999));
    stage.classList.toggle('is-fit', fitted());
  };
  // Keep the image's edges from being dragged past the stage (with 24px to spare).
  const clamp = (z: number, tx: number, ty: number): [number, number] => {
    const img = holder.firstElementChild;
    if (!img) return [tx, ty];
    const r = img.getBoundingClientRect();
    const w = r.width / st.z;
    const h = r.height / st.z;
    const mx = Math.max(0, (w * z - stage.clientWidth) / 2 + 24);
    const my = Math.max(0, (h * z - stage.clientHeight) / 2 + 24);
    return [Math.max(-mx, Math.min(mx, tx)), Math.max(-my, Math.min(my, ty))];
  };
  const setZoom = (z: number, tx: number, ty: number) => {
    st.z = Math.max(1, Math.min(4, z));
    [st.tx, st.ty] = fitted() ? [0, 0] : clamp(st.z, tx, ty);
    apply();
  };
  const zoomAt = (factor: number, cx: number, cy: number) => {
    const k = Math.max(1, Math.min(4, st.z * factor)) / st.z;
    setZoom(st.z * k, cx - (cx - st.tx) * k, cy - (cy - st.ty) * k);
  };
  const rel = (x: number, y: number): [number, number] => {
    const r = stage.getBoundingClientRect();
    return [x - r.left - r.width / 2, y - r.top - r.height / 2];
  };

  const show = (i: number) => {
    st.i = Math.max(0, Math.min(buttons.length - 1, i));
    st.z = 1;
    st.tx = 0;
    st.ty = 0;
    const button = buttons[st.i]!;
    const source = button.querySelector('img');
    const caption = button.closest('figure')?.querySelector('figcaption')?.textContent ?? '';
    holder.replaceChildren();
    if (source) {
      const img = new Image();
      img.src = largestSource(source);
      img.alt = source.alt;
      holder.append(img);
    }
    q('[data-cap]').textContent = caption;
    q('[data-count]').textContent = buttons.length > 1 ? `${st.i + 1} / ${buttons.length}` : '';
    box.setAttribute('aria-label', button.getAttribute('aria-label') ?? 'Image');
    for (const el of qa<HTMLButtonElement>('[data-prev]')) {
      el.setAttribute('aria-disabled', String(st.i === 0));
      el.hidden = buttons.length < 2;
    }
    for (const el of qa<HTMLButtonElement>('[data-next]')) {
      el.setAttribute('aria-disabled', String(st.i === buttons.length - 1));
      el.hidden = buttons.length < 2;
    }
    apply(false);
  };
  const open = (i: number) => {
    opener = document.activeElement as HTMLElement | null;
    show(i);
    box.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    hint.textContent = touch
      ? 'pinch to zoom'
      : window.innerWidth <= 760
        ? 'press + and − to zoom, esc to close'
        : 'scroll or press + and − to zoom, drag to move, esc to close';
    hint.classList.remove('is-gone');
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => hint.classList.add('is-gone'), 3200);
    q<HTMLButtonElement>('[data-close]').focus();
  };
  const close = () => {
    box.hidden = true;
    document.documentElement.style.overflow = '';
    opener?.focus();
  };
  const go = (d: number) => {
    const n = st.i + d;
    if (n >= 0 && n < buttons.length) show(n);
  };

  q('[data-close]').addEventListener('click', close);
  qa('[data-prev]').forEach((el) => el.addEventListener('click', () => go(-1)));
  qa('[data-next]').forEach((el) => el.addEventListener('click', () => go(1)));
  q('[data-in]').addEventListener('click', () => zoomAt(1.5, 0, 0));
  q('[data-out]').addEventListener('click', () => zoomAt(1 / 1.5, 0, 0));
  q('[data-fit]').addEventListener('click', () => setZoom(1, 0, 0));
  stage.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.0022), ...rel(e.clientX, e.clientY));
    },
    { passive: false },
  );
  // The second click of a double-click is ignored, so a double-click zooms once, like a click.
  stage.addEventListener('click', (e) => {
    if (moved) return;
    const target = e.target as Element;
    if (target === stage) {
      if (fitted()) close();
      return;
    }
    if (e.detail > 1 || target.parentElement !== holder) return;
    if (fitted()) zoomAt(2, ...rel(e.clientX, e.clientY));
    else setZoom(1, 0, 0);
  });
  stage.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('button')) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 1) {
      start = { x: e.clientX, y: e.clientY, tx: st.tx, ty: st.ty };
      moved = false;
    }
    if (pointers.size === 2) {
      moved = true;
      const [a, b] = [...pointers.values()] as [[number, number], [number, number]];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: st.z };
    }
    stage.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()] as [[number, number], [number, number]];
      const scale = Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d;
      zoomAt((pinch.z * scale) / st.z, ...rel((a[0] + b[0]) / 2, (a[1] + b[1]) / 2));
      return;
    }
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > 6) moved = true;
    if (!fitted()) [st.tx, st.ty] = clamp(st.z, start.tx + dx, start.ty + dy);
    else st.ty = dy > 0 ? dy * 0.6 : 0; // a hint of the swipe down that closes
    apply(false);
  });
  const up = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    if (start && pointers.size === 1 && fitted()) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      st.ty = 0;
      apply();
      if (dy > 110 && Math.abs(dx) < 80) close();
      else if (Math.abs(dx) > 80 && Math.abs(dy) < 60) go(dx < 0 ? 1 : -1);
    }
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) {
      start = null;
      stage.classList.remove('is-dragging');
    }
  };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === '+' || e.key === '=') zoomAt(1.5, 0, 0);
    else if (e.key === '-' || e.key === '_') zoomAt(1 / 1.5, 0, 0);
    else if (e.key === '0') setZoom(1, 0, 0);
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Tab') {
      const focusable = qa<HTMLButtonElement>('button').filter(
        (b) => b.offsetParent && b.getAttribute('aria-disabled') !== 'true',
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  buttons.forEach((button, i) => button.addEventListener('click', () => open(i)));
}
