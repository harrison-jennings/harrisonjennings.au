// Tells the preview frame around this specimen how tall it is, whenever that changes, so the frame
// fits it without a scrollbar (preview.ts). Does nothing when the specimen is opened on its own.
if (window.parent !== window) {
  const report = () =>
    window.parent.postMessage(
      { type: 'specimen-height', height: document.body.scrollHeight },
      window.location.origin,
    );
  new ResizeObserver(report).observe(document.body);
  window.addEventListener('load', report);
}

// The site's links lead nowhere here (/blog/ isn't a page of the design system), so in a preview they
// stay put rather than loading another page into the frame. Links to other sites still open in their
// new tab, and in-page controls (menus, the theme, the image viewer) work as they do on the site.
if (window.parent !== window) {
  document.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
    if (!link || link.target === '_blank') return;
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin && url.pathname !== location.pathname)
      event.preventDefault();
  });
}
