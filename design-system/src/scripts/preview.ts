// Sizes each preview frame (Preview.astro). The iframe keeps its true width, so the site's own phone
// or desktop layout applies inside it, and is scaled down to fit when the column is narrower; its
// height follows what the specimen reports (specimen.ts).
const iframes = [...document.querySelectorAll<HTMLIFrameElement>('[data-preview] iframe')];
const heights = new Map<HTMLIFrameElement, number>();

function fit(frame: HTMLIFrameElement): void {
  const viewport = frame.parentElement;
  if (!viewport) return;
  const scale = Math.min(1, viewport.clientWidth / Number(frame.width));
  const height = heights.get(frame);
  frame.style.transform = scale < 1 ? `scale(${scale})` : '';
  if (height === undefined) return;
  frame.style.height = `${height}px`;
  viewport.style.height = `${Math.ceil(height * scale)}px`;
}

window.addEventListener('message', (event: MessageEvent) => {
  if (event.origin !== window.location.origin || event.data?.type !== 'specimen-height') return;
  const frame = iframes.find((f) => f.contentWindow === event.source);
  if (!frame || typeof event.data.height !== 'number') return;
  heights.set(frame, event.data.height);
  fit(frame);
});

new ResizeObserver(() => iframes.forEach(fit)).observe(document.body);
