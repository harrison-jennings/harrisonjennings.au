The home page's first screen: "marketing, engineered." over the signal field.

**Markup:**

```html
<section class="hj-hero">
  <div class="hj-hero__clouds" aria-hidden="true"></div>
  <canvas class="hj-hero__field" aria-hidden="true"></canvas>
  <header class="hj-shell"><!-- the nav --></header>
  <div class="hj-hero__body hj-column">
    <h1 class="hj-hero__title">marketing,<br>engineered<span class="hj-hero__stop" aria-hidden="true"></span></h1>
    <div class="hj-hero__row">
      <p class="hj-hero__sub"><span class="hj-hero__lead">Strategy and the stack, from one person.</span><br>I'm Harrison, a marketing technology consultant in Melbourne.</p>
      <div class="hj-hero__actions"><a class="hj-link" href="/blog/">read the blog</a><a class="hj-btn hj-btn--l" href="…">…</a></div>
    </div>
  </div>
  <div class="hj-hero__cue"><div class="hj-column"><span class="hj-cue" aria-hidden="true"><svg …chevron…></svg>scroll</span></div></div>
</section>
```

`HJ.init()` starts the field (`HJ.field(hero)`) and the cue's fade (`HJ.cue(el)`). The nav is positioned absolutely at the top (16px), inside the hero.

- **Height:** fills the screen: `clamp(640px, 100svh, 1080px)`, 560px minimum on phones.
- **Field:** dots on a 26px grid (22px on phones) in `field-dot`; the pointer pushes them aside within 180px (120px on phones) and lights them in `link`; rings every 1.5s from the pointer, every 2.8s from a slow wanderer when idle; click or tap sends one. The clouds sit at 70% opacity under it.
- **The stop:** a 0.19em brick dot, 0.3em clear of the last letter, pulsing two rings that grow only 24px past its edge so they never cross the letters.
- **Type:** `display-hero` (clamp 40–96px; 44px on phones), a -0.045em optical nudge so it lines up under the logo. Subtitle 19px (17px on phones), max 600px so the introduction sits on one line on desktop, `text-wrap: pretty` so it never leaves one word alone on a line. Two sentences on separate lines: the first (`.hj-hero__lead`) in `text`, the introduction in `muted`.
- **Actions:** "read the blog" (text link) then "book a call" (`.hj-btn--l`), aligned to the column's right edge. On phones they stack: the button full width, the link centred under it.
- **Scroll cue:** bottom left on the column edge, 24px up (18px on phones).
- **Reduced motion:** the field draws once, still, with a soft lit patch top right; no rings, no cue movement; the logo sits drawn.
