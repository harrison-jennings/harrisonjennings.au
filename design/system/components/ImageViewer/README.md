The image viewer (lightbox): every image in a post opens full screen, where it can be zoomed and moved around. Made for detailed diagrams.

**Markup:** wrap each image in `<button class="hj-zoomable" type="button" aria-label="View larger: {what it shows}">` with the `<img>` (or inline `<svg>`) and `<span class="hj-zoomable__icon">` (the expand icon). Add `data-hj-full="…"` to load a larger file only when the viewer opens. `HJ.lightbox(root)` (run by `HJ.init`) builds one `.hj-lightbox` dialog for the page and wires every `.hj-zoomable` into one set, in page order.

**In a post:** automatic. Every Markdown image becomes zoomable; an image can opt out with `{nozoom}`.

**The viewer:**
- Near-black in dark (96% of #0a0909), white in light (98%); the image sits inside a hairline. Counter ("1 / 2") and a short hint top left (gone after 3s), close top right; caption bottom left; a control bar bottom right: zoom out, the level ("fit" or a percentage), zoom in, fit to screen.
- Zoom from fit to 400%: scroll wheel, + and − (keys or buttons), double-click or double-tap toggles fit and 200% at that spot, pinch on touch screens. 0 or the fit button resets; fit is faded when already fitted.
- Drag to move once zoomed; it stops at the image's edges.
- Several images: ‹ › at the sides on desktop, at each end of the control bar on phones; arrow keys and sideways swipes too. Faded at the first and last image.
- Close: Esc, the close button, a click on the empty backdrop, or a swipe down on phones. Focus returns to the image that opened it.
- On hover the expand icon appears in the image's top-right corner; on phones it is always shown.

**Images for it:** export diagrams as SVG where possible so they stay sharp at any zoom; otherwise a PNG at 2–3× its shown size. The page loads the smaller image; the large file loads only when the viewer opens.

**Accessibility:** a modal dialog labelled with the image's name; focus moves to close on open and stays inside while open (Tab cycles the controls); every control is a labelled button; the zoom level is announced politely. Reduced motion: zoom and pan jump instead of easing.
