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
