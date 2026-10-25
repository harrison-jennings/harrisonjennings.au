// The hero's signal field: a grid of faint dots that drifts gently. The pointer pushes dots aside and
// lights them in `link`, sending a ring out every 1.5s (every 2.8s from a slow wanderer when nobody
// is pointing); a click or tap sends one too. The headline's brick stop pulses two small rings that
// stay clear of the letters. Pauses when off screen. Under reduced motion it draws once, still, with
// a soft lit patch top right (redrawn now and then, so a theme change shows).
type Dot = {
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ph: number;
  g: number;
};
type Ring = { x: number; y: number; t: number };

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function rgbOf(value: string): [number, number, number] {
  const s = value.trim();
  if (s.startsWith('#')) {
    const hex = s.length === 4 ? `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}` : s;
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
  }
  const m = s.match(/[\d.]+/g) ?? ['239', '234', '230'];
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}

export function bindField(hero: HTMLElement, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let dots: Dot[] = [];
  let rings: Ring[] = [];
  let lastRing = 0;
  let lastStill = 0;
  let lastFrame = 0;
  let visible = true;
  let stop: { x: number; y: number; r: number } | null = null;
  let stopAt = 0;
  const ptr = { x: 0, y: 0, on: false, last: 0 };
  const stopEl = hero.querySelector<HTMLElement>('[data-hero-stop]');

  // The colours change only with the theme, so they're read then, not on every frame (reading
  // computed styles makes the browser recalculate them).
  let dotColour = '';
  let [cr, cg, cb] = [0, 0, 0];
  const readColours = () => {
    const cs = getComputedStyle(hero);
    dotColour = cs.getPropertyValue('--field-dot').trim();
    [cr, cg, cb] = rgbOf(cs.getPropertyValue('--link'));
  };
  readColours();
  new MutationObserver(readColours).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  const resize = () => {
    const r = hero.getBoundingClientRect();
    if (Math.abs(r.width - w) < 1 && Math.abs(r.height - h) < 1 && dots.length) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const gap = w < 600 ? 22 : 26;
    let seed = 11;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    dots = [];
    for (let y = gap / 2; y < h; y += gap) {
      for (let x = gap / 2; x < w; x += gap) {
        const hx = x + (rnd() - 0.5) * 9;
        const hy = y + (rnd() - 0.5) * 9;
        dots.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0, ph: rnd() * 6.283, g: 0 });
      }
    }
    lastStill = 0;
  };

  const at = (e: PointerEvent): [number, number] => {
    const r = hero.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  hero.addEventListener(
    'pointermove',
    (e) => {
      [ptr.x, ptr.y] = at(e);
      ptr.on = true;
      ptr.last = performance.now();
    },
    { passive: true },
  );
  hero.addEventListener('pointerleave', () => (ptr.on = false));
  hero.addEventListener('pointerdown', (e) => {
    const [x, y] = at(e);
    rings.push({ x, y, t: performance.now() });
  });

  const render = (now: number) => {
    if (!visible || !w) {
      lastFrame = 0;
      return;
    }
    const still = reducedMotion();
    if (still && now - lastStill < 500) return;
    lastStill = now;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const t = still ? 0 : now;
    // The motion is tuned per 60th of a second, and scaled by the real time since the last frame, so it
    // moves at the same pace on a 60 Hz or a 120 Hz screen (capped, so a stalled tab doesn't jolt).
    const dt = lastFrame ? Math.min(Math.max((now - lastFrame) / (1000 / 60), 0.25), 3) : 1;
    lastFrame = now;
    const damp = 0.84 ** dt;
    const fade = 0.94 ** dt;
    const idle = !ptr.on || now - ptr.last > 2500;
    let px: number;
    let py: number;
    let k: number;
    if (still) [px, py, k] = [w * 0.8, h * 0.28, 0.7];
    else if (idle)
      [px, py, k] = [
        w * (0.64 + 0.2 * Math.sin(t * 0.00019)),
        h * (0.42 + 0.22 * Math.sin(t * 0.00031 + 1.3)),
        0.5,
      ];
    else [px, py, k] = [ptr.x, ptr.y, 1];

    if (!still && now - lastRing > (idle ? 2800 : 1500)) {
      rings.push({ x: px, y: py, t: now });
      lastRing = now;
    }
    rings = rings.filter((r) => now - r.t < 1900);
    const live = still
      ? []
      : rings.map((r) => {
          const a = (now - r.t) / 1900;
          return { x: r.x, y: r.y, r: a * 320, a: (1 - a) * (1 - a) };
        });

    const reach = w < 600 ? 120 : 180;
    const lit: Dot[] = [];
    ctx.fillStyle = dotColour;
    for (const q of dots) {
      const dx = q.x - px;
      const dy = q.y - py;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const e = d < reach ? 1 - d / reach : 0;
      if (!still) {
        let g = 0;
        if (e > 0) {
          const f = e * e * 2.4 * k;
          q.vx += (dx / d) * f * dt;
          q.vy += (dy / d) * f * dt;
        }
        for (const ring of live) {
          const rx = q.x - ring.x;
          const ry = q.y - ring.y;
          const rd = Math.sqrt(rx * rx + ry * ry) || 1;
          const band = 1 - Math.abs(rd - ring.r) / 18;
          if (band > 0) {
            const s = band * ring.a;
            g = Math.max(g, s);
            q.vx += (rx / rd) * s * 1.1 * dt;
            q.vy += (ry / rd) * s * 1.1 * dt;
          }
        }
        const ox = Math.sin(t * 0.0007 + q.ph) * 1.6;
        const oy = Math.cos(t * 0.0006 + q.ph * 1.3) * 1.6;
        q.vx = (q.vx + (q.hx + ox - q.x) * 0.035 * dt) * damp;
        q.vy = (q.vy + (q.hy + oy - q.y) * 0.035 * dt) * damp;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.g = Math.max(q.g * fade, e * k, g);
      } else {
        q.x = q.hx;
        q.y = q.hy;
        q.g = e * k * 0.8;
      }
      if (q.g > 0.06) lit.push(q);
      else ctx.fillRect(q.x - 0.9, q.y - 0.9, 1.8, 1.8);
    }
    for (const q of lit) {
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.min(1, 0.25 + q.g * 0.9).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(q.x, q.y, 0.9 + q.g * 1.7, 0, 6.2832);
      ctx.fill();
    }

    if (stopEl && (!stop || now - stopAt > 500)) {
      stopAt = now;
      const a = stopEl.getBoundingClientRect();
      const b = hero.getBoundingClientRect();
      stop = { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2, r: a.width / 2 };
    }
    if (stop && !still) {
      for (let i = 0; i < 2; i++) {
        const sa = (now / 2200 + i * 0.5) % 1;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${((1 - sa) * 0.6).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(stop.x, stop.y, stop.r + sa * 24, 0, 6.2832);
        ctx.stroke();
      }
    }
  };

  resize();
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
  }).observe(hero);

  const frame = (now: number) => {
    requestAnimationFrame(frame);
    render(now);
  };
  requestAnimationFrame(frame);
}

/** The scroll cue fades out over the first 160px of scroll. */
export function bindCue(cue: HTMLElement): void {
  const update = () => (cue.style.opacity = String(Math.max(0, 1 - window.scrollY / 160)));
  window.addEventListener('scroll', update, { passive: true });
  update();
}
