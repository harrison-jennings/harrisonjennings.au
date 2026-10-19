// The logo draw: the dot runs 16 units ahead of the line, down the stem, back up,
// round the arch and down the leg, then rests at the foot. Still under reduced motion.
const H = 'M30 10 V90 M30 58 C30 44 39 38 50 38 C61 38 70 44 70 58 V72';
const DRAW = 'M30 10 V90 V58 C30 44 39 38 50 38 C61 38 70 44 70 58 V72';
const LEAD = 16;
const DURATION = 2040;

type Point = [x: number, y: number, distance: number];
let samples: Point[] | null = null;

function sample(): Point[] {
  if (samples) return samples;
  const pts: Point[] = [];
  let acc = 0;
  let prev: [number, number] | null = null;
  const push = (x: number, y: number) => {
    if (prev) acc += Math.hypot(x - prev[0], y - prev[1]);
    prev = [x, y];
    pts.push([x, y, acc]);
  };
  const cubic = (p0: number, p1: number, p2: number, p3: number, u: number) => {
    const a = 1 - u;
    return a * a * a * p0 + 3 * a * a * u * p1 + 3 * a * u * u * p2 + u * u * u * p3;
  };
  for (let i = 0; i <= 80; i++) push(30, 10 + i);
  for (let i = 1; i <= 32; i++) push(30, 90 - i);
  for (let i = 1; i <= 200; i++)
    push(cubic(30, 30, 39, 50, i / 200), cubic(58, 44, 38, 38, i / 200));
  for (let i = 1; i <= 200; i++)
    push(cubic(50, 61, 70, 70, i / 200), cubic(38, 38, 44, 58, i / 200));
  for (let i = 1; i <= 30; i++) push(70, 58 + i);
  samples = pts;
  return pts;
}

function pointAt(pts: Point[], d: number): [number, number] {
  for (let i = 1; i < pts.length; i++) {
    const p1 = pts[i]!;
    if (p1[2] >= d) {
      const p0 = pts[i - 1]!;
      const r = (d - p0[2]) / (p1[2] - p0[2] || 1);
      return [p0[0] + (p1[0] - p0[0]) * r, p0[1] + (p1[1] - p0[1]) * r];
    }
  }
  const last = pts[pts.length - 1]!;
  return [last[0], last[1]];
}

const easeInOutQuad = (g: number) => (g < 0.5 ? 2 * g * g : 1 - Math.pow(-2 * g + 2, 2) / 2);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const running = new WeakSet<SVGSVGElement>();

export function draw(svg: SVGSVGElement): void {
  if (reducedMotion() || running.has(svg)) return;
  const h = svg.querySelector<SVGPathElement>('.mark__h');
  const dot = svg.querySelector<SVGCircleElement>('.mark__dot');
  if (!h || !dot) return;
  running.add(svg);

  const pts = sample();
  const lineEnd = pts[pts.length - 1]![2] - LEAD;
  h.setAttribute('d', DRAW);
  const length = h.getTotalLength();
  h.style.strokeDasharray = `${length} ${length}`;

  let start: number | null = null;
  const frame = (now: number) => {
    start ??= now;
    const g = Math.min((now - start) / DURATION, 1);
    const tip = lineEnd * easeInOutQuad(g);
    const [x, y] = pointAt(pts, tip + LEAD);
    h.style.strokeDashoffset = String(length - length * (tip / lineEnd));
    dot.setAttribute('cx', x.toFixed(2));
    dot.setAttribute('cy', y.toFixed(2));
    if (g < 1) {
      requestAnimationFrame(frame);
    } else {
      h.setAttribute('d', H);
      h.style.strokeDasharray = '';
      h.style.strokeDashoffset = '';
      dot.setAttribute('cx', '70');
      dot.setAttribute('cy', '88');
      running.delete(svg);
    }
  };
  requestAnimationFrame(frame);
}

/**
 * Plays the draw once (now, or when the mark first comes into view), then again whenever the closest
 * `[data-logo-draw]` host (or the mark) is hovered.
 */
export function bindDraw(svg: SVGSVGElement, when: 'load' | 'view' = 'load'): void {
  const host = svg.closest<HTMLElement>('[data-logo-draw]') ?? svg;
  if (when === 'view' && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          draw(svg);
        }
      },
      { threshold: 0.6 },
    );
    io.observe(host);
  } else {
    draw(svg);
  }
  host.addEventListener('pointerenter', () => draw(svg));
}
