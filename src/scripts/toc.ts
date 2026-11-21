// "on this page" marks the section being read: the last heading whose top has passed 140px.
// A nav with `data-toc-rail` also draws its rail as one line that steps in beside each group of h3s,
// with a marker that slides along it, round the steps, to the section being read.
export function bindToc(nav: HTMLElement): void {
  const links = [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const heads = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))));
  const rail = 'tocRail' in nav.dataset ? drawRail(nav, links) : undefined;
  let queued = false;
  const update = () => {
    queued = false;
    let current = 0;
    heads.forEach((h, i) => {
      if (h && h.getBoundingClientRect().top <= 140) current = i;
    });
    links.forEach((a, i) => a.setAttribute('aria-current', String(i === current)));
    rail?.mark(current);
    reveal(nav, links[current]);
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

/** A list too long for the screen scrolls inside itself: keep the marked link in view, a link's
 * height clear of either end, without scrolling the page. */
function reveal(nav: HTMLElement, link: HTMLAnchorElement | undefined): void {
  if (!link || nav.scrollHeight <= nav.clientHeight) return;
  const box = nav.getBoundingClientRect();
  const r = link.getBoundingClientRect();
  const room = r.height;
  if (r.top < box.top + room) nav.scrollTop -= box.top + room - r.top;
  else if (r.bottom > box.bottom - room) nav.scrollTop += r.bottom - (box.bottom - room);
}

const SVG = 'http://www.w3.org/2000/svg';
/** How far right of the h2s' rail the h3s' runs. */
const INDENT = 14;
/** Each step's start and end, above and below the line between two links: their padding. */
const BEND = 6;

/**
 * Draws the rail beside the list and returns `mark`, which moves the marker to a link. The rail and
 * the marker are one path: the marker is a single dash, as long as its link's run, offset to start
 * where that run starts, so a change of section slides it along the line. Without this script, the
 * list's straight border and each link's own border stand in.
 */
function drawRail(nav: HTMLElement, links: HTMLAnchorElement[]): { mark: (i: number) => void } {
  const list = nav.querySelector<HTMLElement>(':scope > ol');
  if (!list || !links.length) return { mark: () => undefined };
  const svg = document.createElementNS(SVG, 'svg');
  const track = document.createElementNS(SVG, 'path');
  const marker = document.createElementNS(SVG, 'path');
  svg.setAttribute('class', 'toc__rail');
  svg.setAttribute('aria-hidden', 'true');
  track.setAttribute('class', 'toc__track');
  marker.setAttribute('class', 'toc__marker');
  svg.append(track, marker);
  nav.append(svg);
  nav.classList.add('toc--rail');

  // Where each link's run starts and ends, as distances along the path.
  let starts: number[] = [];
  let ends: number[] = [];
  let total = 0;
  let current = -1;

  const place = () => {
    const i = current;
    if (i < 0 || starts[i] === undefined || ends[i] === undefined) return;
    marker.style.strokeDasharray = `${ends[i] - starts[i]} ${total + 1}`;
    marker.style.strokeDashoffset = String(-starts[i]);
  };

  const layout = () => {
    const box = nav.getBoundingClientRect();
    const left = list.getBoundingClientRect().left - box.left + 0.5;
    // Positions within the nav's content, which may be scrolled.
    const offset = nav.scrollTop - box.top;
    const rows = links.map((a) => {
      const r = a.getBoundingClientRect();
      return {
        x: left + (a.closest('.toc__sub') ? INDENT : 0),
        top: r.top + offset,
        bottom: r.bottom + offset,
      };
    });
    let d = '';
    let length = 0;
    let x = 0;
    let y = 0;
    const to = (nx: number, ny: number) => {
      length += Math.hypot(nx - x, ny - y);
      d += `L${nx} ${ny}`;
      x = nx;
      y = ny;
    };
    starts = [];
    ends = [];
    rows.forEach((row, i) => {
      const before = rows[i - 1];
      const after = rows[i + 1];
      const top = row.top + (before && before.x !== row.x ? BEND : 0);
      const bottom = row.bottom - (after && after.x !== row.x ? BEND : 0);
      if (i === 0) {
        d = `M${row.x} ${top}`;
        x = row.x;
        y = top;
      } else to(row.x, top);
      starts.push(length);
      to(row.x, bottom);
      ends.push(length);
    });
    total = length;
    svg.setAttribute('width', String(left + INDENT + 2));
    svg.setAttribute('height', String(y + 1));
    track.setAttribute('d', d);
    marker.setAttribute('d', d);
    place();
  };

  layout();
  // Text wrapping and the web fonts arriving move the links: redraw, without sliding.
  new ResizeObserver(() => {
    nav.classList.remove('toc--ready');
    layout();
    requestAnimationFrame(() => nav.classList.add('toc--ready'));
  }).observe(list);

  return {
    mark: (i) => {
      if (i === current) return;
      current = i;
      place();
    },
  };
}
