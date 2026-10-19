/* Harrison Jennings: the small behaviours behind the components. Plain script, no dependencies. */
(function () {
  'use strict';
  var H_PATH = 'M30 10 V90 M30 58 C30 44 39 38 50 38 C61 38 70 44 70 58 V72';
  var DRAW_PATH = 'M30 10 V90 V58 C30 44 39 38 50 38 C61 38 70 44 70 58 V72';
  var SVG_NS = 'http://www.w3.org/2000/svg';
  // stroke and dot by rendered size: thicker as the mark gets smaller
  var WEIGHTS = [[100, 11, 7.5], [40, 11, 7.5], [26, 12, 8.5], [24, 15, 9.5], [0, 17, 10.5]];

  function reduced() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function weightFor(size) {
    for (var i = 0; i < WEIGHTS.length; i++) if (size >= WEIGHTS[i][0]) return WEIGHTS[i];
    return WEIGHTS[WEIGHTS.length - 1];
  }

  /* markSvg(size, opts) returns the mark's markup. opts.label gives it an accessible name; otherwise it is hidden from assistive tech. */
  function markSvg(size, opts) {
    opts = opts || {};
    var w = weightFor(size), stroke = opts.stroke || w[1], dot = opts.dot || w[2];
    var a11y = opts.label ? 'role="img" aria-label="' + String(opts.label).replace(/"/g, '&quot;') + '"' : 'aria-hidden="true"';
    var cls = 'hj-mark' + (opts.className ? ' ' + opts.className : '');
    return '<svg class="' + cls + '" width="' + size + '" height="' + size + '" viewBox="0 0 100 100" ' + a11y + '>' +
      '<path class="hj-mark__h" d="' + H_PATH + '" stroke-width="' + stroke + '"></path>' +
      (opts.signal ? '<circle class="hj-mark__ring" cx="70" cy="88" r="' + dot + '"></circle>' : '') +
      '<circle class="hj-mark__dot" cx="70" cy="88" r="' + dot + '"></circle></svg>';
  }

  /* the draw: the dot runs 16 units ahead of the line, down the stem, back up, round the arch and down the leg, then rests at the foot */
  var samples = null;
  function sample() {
    if (samples) return samples;
    var pts = [], acc = 0, prev = null, i, u, a;
    function push(x, y) { if (prev) acc += Math.hypot(x - prev[0], y - prev[1]); prev = [x, y]; pts.push([x, y, acc]); }
    for (i = 0; i <= 80; i++) push(30, 10 + i);
    for (i = 1; i <= 32; i++) push(30, 90 - i);
    for (i = 1; i <= 200; i++) { u = i / 200; a = 1 - u; push(a*a*a*30 + 3*a*a*u*30 + 3*a*u*u*39 + u*u*u*50, a*a*a*58 + 3*a*a*u*44 + 3*a*u*u*38 + u*u*u*38); }
    for (i = 1; i <= 200; i++) { u = i / 200; a = 1 - u; push(a*a*a*50 + 3*a*a*u*61 + 3*a*u*u*70 + u*u*u*70, a*a*a*38 + 3*a*a*u*38 + 3*a*u*u*44 + u*u*u*58); }
    for (i = 1; i <= 30; i++) push(70, 58 + i);
    samples = pts;
    return pts;
  }
  function pointAt(pts, d) {
    for (var i = 1; i < pts.length; i++) {
      if (pts[i][2] >= d) {
        var p0 = pts[i - 1], p1 = pts[i], r = (d - p0[2]) / ((p1[2] - p0[2]) || 1);
        return [p0[0] + (p1[0] - p0[0]) * r, p0[1] + (p1[1] - p0[1]) * r];
      }
    }
    var l = pts[pts.length - 1];
    return [l[0], l[1]];
  }
  function easeInOutQuad(g) { return g < 0.5 ? 2 * g * g : 1 - Math.pow(-2 * g + 2, 2) / 2; }

  /* draw(svg, opts): plays the draw once on a .hj-mark. opts.duration (ms, default 2040), opts.loop (true to repeat on the 3.4s demo cycle). Returns a stop function. */
  function draw(svg, opts) {
    opts = opts || {};
    if (!svg || reduced()) return function () {};
    var h = svg.querySelector('.hj-mark__h'), dot = svg.querySelector('.hj-mark__dot');
    if (!h || !dot) return function () {};
    if (svg._hjStop) svg._hjStop();
    var pts = sample(), dotEnd = pts[pts.length - 1][2], lineEnd = dotEnd - 16;
    h.setAttribute('d', DRAW_PATH);
    var real = h.getTotalLength ? h.getTotalLength() : lineEnd;
    h.style.strokeDasharray = real + ' ' + real;
    var dur = opts.duration || 2040, cycle = dur / 0.6, start = null, raf = 0;
    function frame(now) {
      if (start === null) start = now;
      var el = now - start, f = opts.loop ? (el % cycle) / cycle : Math.min(el / dur, 1) * 0.6;
      var g = Math.min(f / 0.6, 1), tip = lineEnd * easeInOutQuad(g), p = pointAt(pts, tip + 16);
      h.style.strokeDashoffset = String(real - real * (tip / lineEnd));
      dot.setAttribute('cx', p[0].toFixed(2));
      dot.setAttribute('cy', p[1].toFixed(2));
      svg.style.opacity = opts.loop && f > 0.85 ? String(1 - (f - 0.85) / 0.15) : '';
      if (opts.loop || el < dur) { raf = requestAnimationFrame(frame); } else { finish(); }
    }
    function finish() {
      cancelAnimationFrame(raf);
      h.setAttribute('d', H_PATH);
      h.style.strokeDasharray = ''; h.style.strokeDashoffset = '';
      dot.setAttribute('cx', '70'); dot.setAttribute('cy', '88');
      svg.style.opacity = '';
      svg._hjStop = null;
    }
    raf = requestAnimationFrame(frame);
    svg._hjStop = finish;
    return finish;
  }

  /* wipe(button): apricot wipes in from the side the pointer enters and out the side it leaves; plays once on tap */
  function wipe(btn) {
    if (!btn || btn._hjWipe) return;
    var layer = btn.querySelector('.hj-btn__wipe');
    if (!layer) return;
    btn._hjWipe = true;
    var CLOSED_L = 'inset(0 100% 0 0)', CLOSED_R = 'inset(0 0 0 100%)', OPEN = 'inset(0 0 0 0)';
    function side(e) { var r = btn.getBoundingClientRect(); return e.clientX < r.left + r.width / 2 ? 'l' : 'r'; }
    function jump(v) { layer.style.transition = 'none'; layer.style.clipPath = v; void layer.offsetWidth; layer.style.transition = ''; }
    btn.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch') return;
      jump(side(e) === 'l' ? CLOSED_L : CLOSED_R);
      layer.style.clipPath = OPEN;
    });
    btn.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'touch') return;
      layer.style.clipPath = side(e) === 'l' ? CLOSED_L : CLOSED_R;
    });
    btn.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch') return;
      jump(CLOSED_L);
      layer.style.clipPath = OPEN;
      setTimeout(function () { layer.style.clipPath = CLOSED_R; }, 520);
    });
    btn.addEventListener('focus', function () { if (btn.matches(':focus-visible')) { jump(CLOSED_L); layer.style.clipPath = OPEN; } });
    btn.addEventListener('blur', function () { layer.style.clipPath = CLOSED_R; });
  }

  /* demoWipe(button): loops the wipe on the 3s demo cycle (in 0.12–0.40, out 0.68–0.92) so it can be watched without a pointer */
  function demoWipe(btn) {
    var layer = btn && btn.querySelector('.hj-btn__wipe');
    if (!layer || reduced()) return function () {};
    layer.style.transition = 'none';
    var start = null, raf = 0;
    function ease(v) { v = v < 0 ? 0 : v > 1 ? 1 : v; return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; }
    function frame(now) {
      if (start === null) start = now;
      var t = ((now - start) % 3000) / 3000, right = 100, left = 0;
      function span(a, b) { return ease((t - a) / (b - a)); }
      if (t < 0.40) { right = 100 - 100 * span(0.12, 0.40); } else { right = 0; left = t < 0.68 ? 0 : 100 * span(0.68, 0.92); }
      layer.style.clipPath = 'inset(0 ' + right.toFixed(2) + '% 0 ' + left.toFixed(2) + '%)';
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return function () { cancelAnimationFrame(raf); layer.style.transition = ''; layer.style.clipPath = ''; };
  }

  /* nav(el, opts): adds .is-compact once the page scrolls past opts.threshold (default 80px); hovering or focusing the compact bar opens it back up */
  function nav(el, opts) {
    if (!el || el._hjNav) return;
    el._hjNav = true;
    var threshold = (opts && opts.threshold) || 80, over = false;
    function update() { el.classList.toggle('is-compact', window.scrollY > threshold && !over); }
    window.addEventListener('scroll', update, { passive: true });
    el.addEventListener('pointerenter', function () { over = true; update(); });
    el.addEventListener('pointerleave', function () { over = false; update(); });
    el.addEventListener('focusin', function () { over = true; update(); });
    el.addEventListener('focusout', function () { over = false; update(); });
    update();
  }

  function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function labelFor(t) { return t === 'light' ? 'Switch to dark mode' : 'Switch to light mode'; }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    Array.prototype.forEach.call(document.querySelectorAll('[data-hj-theme]'), function (b) { b.setAttribute('aria-label', labelFor(t)); });
  }
  function themeToggle(btn) {
    if (!btn || btn._hjTheme) return;
    btn._hjTheme = true;
    btn.setAttribute('aria-label', labelFor(currentTheme()));
    btn.addEventListener('click', function () { setTheme(currentTheme() === 'light' ? 'dark' : 'light'); });
  }

  /* cue(el): the scroll cue fades out over the first 160px of scroll */
  function cue(el) {
    if (!el || el._hjCue) return;
    el._hjCue = true;
    function update() { el.style.opacity = String(Math.max(0, 1 - (window.scrollY || 0) / 160)); }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* field(hero): the hero's signal field. A grid of dots drifts gently; the pointer pushes them aside and lights them in link,
     sending a ring out every 1.5s (every 2.8s from a slow wanderer when idle); a click or tap sends one too. The headline's
     brick stop (.hj-hero__stop) pulses small rings that stay clear of the letters. Still under reduced motion. */
  function rgbOf(s) {
    s = (s || '').trim();
    if (s.charAt(0) === '#') {
      if (s.length === 4) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
      return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 1];
    }
    var m = s.match(/[\d.]+/g) || [239, 234, 230, 1];
    return [+m[0], +m[1], +m[2], m[3] != null ? +m[3] : 1];
  }
  function field(hero) {
    if (!hero || hero._hjField) return;
    var cv = hero.querySelector('.hj-hero__field');
    if (!cv || !cv.getContext) return;
    hero._hjField = true;
    var ctx = cv.getContext('2d'), w = 0, h = 0, dpr = 1, pts = [], rings = [], lastRing = 0, raf = 0, visible = true;
    var ptr = { x: 0, y: 0, on: false, last: 0 }, stop = null, stopAt = 0, lastStill = 0;
    function resize() {
      var r = hero.getBoundingClientRect();
      if (Math.abs(r.width - w) < 1 && Math.abs(r.height - h) < 1 && pts.length) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2); w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      var gap = w < 600 ? 22 : 26, seed = 11;
      var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      pts = [];
      for (var y = gap / 2; y < h; y += gap) for (var x = gap / 2; x < w; x += gap) {
        var hx = x + (rnd() - 0.5) * 9, hy = y + (rnd() - 0.5) * 9;
        pts.push({ hx: hx, hy: hy, x: hx, y: hy, vx: 0, vy: 0, ph: rnd() * 6.283, g: 0 });
      }
      lastStill = 0;
    }
    function at(e) { var r = hero.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    hero.addEventListener('pointermove', function (e) { var p = at(e); ptr.x = p[0]; ptr.y = p[1]; ptr.on = true; ptr.last = performance.now(); }, { passive: true });
    hero.addEventListener('pointerleave', function () { ptr.on = false; });
    hero.addEventListener('pointerdown', function (e) { var p = at(e); rings.push({ x: p[0], y: p[1], t: performance.now() }); });
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!visible || !w) return;
      var still = reduced();
      if (still && now - lastStill < 500) return;
      lastStill = now;
      var cs = getComputedStyle(hero), dot = cs.getPropertyValue('--field-dot').trim() || 'rgba(239,234,230,0.17)', c = rgbOf(cs.getPropertyValue('--link'));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      var t = still ? 0 : now, idle = !ptr.on || now - ptr.last > 2500, px, py, k;
      if (still) { px = w * 0.8; py = h * 0.28; k = 0.7; }
      else if (idle) { px = w * (0.64 + 0.2 * Math.sin(t * 0.00019)); py = h * (0.42 + 0.22 * Math.sin(t * 0.00031 + 1.3)); k = 0.5; }
      else { px = ptr.x; py = ptr.y; k = 1; }
      if (!still && now - lastRing > (idle ? 2800 : 1500)) { rings.push({ x: px, y: py, t: now }); lastRing = now; }
      rings = rings.filter(function (r) { return now - r.t < 1900; });
      var live = still ? [] : rings.map(function (r) { var a = (now - r.t) / 1900; return { x: r.x, y: r.y, r: a * 320, a: (1 - a) * (1 - a) }; });
      var R = w < 600 ? 120 : 180, lit = [];
      ctx.fillStyle = dot;
      for (var j = 0; j < pts.length; j++) {
        var q = pts[j], dx = q.x - px, dy = q.y - py, d = Math.sqrt(dx * dx + dy * dy) || 1, e = d < R ? 1 - d / R : 0, g = 0;
        if (!still) {
          if (e > 0) { var f = e * e * 2.4 * k; q.vx += dx / d * f; q.vy += dy / d * f; }
          for (var m = 0; m < live.length; m++) {
            var rr = live[m], rx = q.x - rr.x, ry = q.y - rr.y, rd = Math.sqrt(rx * rx + ry * ry) || 1, band = 1 - Math.abs(rd - rr.r) / 18;
            if (band > 0) { var s = band * rr.a; g = Math.max(g, s); q.vx += rx / rd * s * 1.1; q.vy += ry / rd * s * 1.1; }
          }
          var ox = Math.sin(t * 0.0007 + q.ph) * 1.6, oy = Math.cos(t * 0.0006 + q.ph * 1.3) * 1.6;
          q.vx += (q.hx + ox - q.x) * 0.035; q.vy += (q.hy + oy - q.y) * 0.035;
          q.vx *= 0.84; q.vy *= 0.84; q.x += q.vx; q.y += q.vy;
          q.g = Math.max(q.g * 0.94, e * k, g);
        } else { q.x = q.hx; q.y = q.hy; q.g = e * k * 0.8; }
        if (q.g > 0.06) lit.push(q); else ctx.fillRect(q.x - 0.9, q.y - 0.9, 1.8, 1.8);
      }
      for (var n = 0; n < lit.length; n++) {
        var L = lit[n];
        ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.min(1, 0.25 + L.g * 0.9).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(L.x, L.y, 0.9 + L.g * 1.7, 0, 6.2832); ctx.fill();
      }
      if (!stop || now - stopAt > 500) {
        stopAt = now;
        var el = hero.querySelector('.hj-hero__stop');
        if (el) { var a1 = el.getBoundingClientRect(), b1 = hero.getBoundingClientRect(); stop = { x: a1.left - b1.left + a1.width / 2, y: a1.top - b1.top + a1.height / 2, r: a1.width / 2 }; }
      }
      if (stop && !still) {
        for (var s2 = 0; s2 < 2; s2++) {
          var sa = ((now / 2200) + s2 * 0.5) % 1;
          ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + ((1 - sa) * 0.6).toFixed(3) + ')';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(stop.x, stop.y, stop.r + sa * 24, 0, 6.2832); ctx.stroke();
        }
      }
    }
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(hero); else window.addEventListener('resize', resize);
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(hero);
    raf = requestAnimationFrame(frame);
  }

  /* swipe(row): arrow buttons for a row that swipes on phones. The row is [data-hj-swipe="key"];
     its buttons are [data-hj-prev="key"] and [data-hj-next="key"]. Each press moves one card. */
  function swipe(row) {
    if (row._hjSwipe) return; row._hjSwipe = true;
    var key = row.getAttribute('data-hj-swipe');
    var prev = document.querySelector('[data-hj-prev="' + key + '"]');
    var next = document.querySelector('[data-hj-next="' + key + '"]');
    function step(dir) {
      var card = row.firstElementChild; if (!card) return;
      var gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      row.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: reduced() ? 'auto' : 'smooth' });
    }
    function update() {
      var max = row.scrollWidth - row.clientWidth;
      if (prev) prev.setAttribute('aria-disabled', row.scrollLeft <= 4 ? 'true' : 'false');
      if (next) next.setAttribute('aria-disabled', row.scrollLeft >= max - 4 ? 'true' : 'false');
    }
    if (prev) prev.addEventListener('click', function () { if (prev.getAttribute('aria-disabled') !== 'true') step(-1); });
    if (next) next.addEventListener('click', function () { if (next.getAttribute('aria-disabled') !== 'true') step(1); });
    var queued = false;
    row.addEventListener('scroll', function () { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; update(); }); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* switcher(el): tabs for "built and shipped". Click or arrow keys move between projects. */
  function switcher(el) {
    if (el._hjSwitch) return; el._hjSwitch = true;
    var tabs = Array.prototype.slice.call(el.querySelectorAll('[role="tab"]'));
    function pick(i, focus) {
      tabs.forEach(function (t, j) {
        var on = i === j, pane = document.getElementById(t.getAttribute('aria-controls'));
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (pane) { if (on) pane.removeAttribute('hidden'); else pane.setAttribute('hidden', ''); }
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { pick(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = tabs.length;
        if (k === 'ArrowDown' || k === 'ArrowRight') { e.preventDefault(); pick((i + 1) % n, true); }
        else if (k === 'ArrowUp' || k === 'ArrowLeft') { e.preventDefault(); pick((i - 1 + n) % n, true); }
        else if (k === 'Home') { e.preventDefault(); pick(0, true); }
        else if (k === 'End') { e.preventDefault(); pick(n - 1, true); }
      });
    });
    var start = tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; });
    pick(start < 0 ? 0 : start);
  }

  /* ticker(el): the testimonials row. Pauses on hover and focus (CSS); the pause button toggles it.
     The track holds the quotes twice; the second set is aria-hidden. */
  function ticker(el) {
    if (el._hjTicker) return; el._hjTicker = true;
    var btn = document.querySelector('[data-hj-pause="' + (el.id || '') + '"]');
    if (!btn) return;
    if (reduced()) { btn.hidden = true; return; }
    btn.addEventListener('click', function () {
      var paused = el.getAttribute('data-paused') !== 'true';
      el.setAttribute('data-paused', paused ? 'true' : 'false');
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      btn.setAttribute('aria-label', paused ? 'Play testimonials' : 'Pause testimonials');
    });
  }

  /* booking(el): "view availability" reveals the calendar and only then asks the page to load it.
     Listen for the 'hj:book-open' event on the band to inject the Cal.com embed. */
  function booking(el) {
    if (el._hjBook) return; el._hjBook = true;
    var btn = el.querySelector('[data-hj-book-toggle]'), cal = el.querySelector('.hj-book__cal');
    if (!btn || !cal) return;
    var loaded = false;
    btn.addEventListener('click', function () {
      var open = cal.hasAttribute('hidden');
      if (open) cal.removeAttribute('hidden'); else cal.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      Array.prototype.forEach.call(btn.querySelectorAll('[data-hj-label]'), function (s) { s.textContent = open ? 'hide availability' : 'view availability'; });
      if (open && !loaded) { loaded = true; el.dispatchEvent(new CustomEvent('hj:book-open', { bubbles: true })); }
    });
  }

  /* toc(nav): "on this page" marks the section being read. Headings are the ids its links point at. */
  function toc(nav) {
    if (nav._hjToc) return; nav._hjToc = true;
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var heads = links.map(function (a) { return document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); });
    var queued = false;
    function update() {
      queued = false;
      var act = 0;
      heads.forEach(function (h, i) { if (h && h.getBoundingClientRect().top <= 140) act = i; });
      links.forEach(function (a, i) { a.setAttribute('aria-current', i === act ? 'true' : 'false'); });
    }
    window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* copyCode(btn): the copy button on a code block; copies the code, minus terminal prompts. */
  function copyCode(btn) {
    if (btn._hjCopy) return; btn._hjCopy = true;
    btn.addEventListener('click', function () {
      var block = btn.closest('.hj-codeblock'), code = block && block.querySelector('code');
      if (!code) return;
      var clone = code.cloneNode(true);
      Array.prototype.forEach.call(clone.querySelectorAll('.hj-tk-prompt'), function (p) { p.remove(); });
      var text = Array.prototype.map.call(clone.querySelectorAll('.line'), function (l) { return l.textContent; }).join('\n') || clone.textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () {
        btn.textContent = 'copied'; setTimeout(function () { btn.textContent = 'copy'; }, 1600);
      }, function () {});
    });
  }

  /* lightbox(root): every .hj-zoomable opens the image viewer. A post's images form one set,
     stepped with the arrows. The full-size file comes from data-hj-full when given. */
  function lightbox(root) {
    var items = Array.prototype.slice.call(root.querySelectorAll('.hj-zoomable')).filter(function (b) { return !b._hjLb; });
    if (!items.length) return;
    var all = Array.prototype.slice.call(document.querySelectorAll('.hj-zoomable'));
    var P = function (d) { return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"></path></svg>'; };
    var box = document.querySelector('.hj-lightbox');
    if (!box) {
      box = document.createElement('div');
      box.className = 'hj-lightbox'; box.hidden = true;
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
      box.innerHTML = '<div class="hj-lightbox__top"><span data-count></span><span class="hj-lightbox__hint" data-hint></span><button class="hj-lightbox__btn" type="button" data-close aria-label="Close">' + P('M6 6l12 12M18 6L6 18') + '</button></div>'
        + '<div class="hj-lightbox__stage is-fit" data-stage><button class="hj-lightbox__btn hj-lightbox__side hj-lightbox__side--prev" type="button" data-prev aria-label="Previous image">' + P('M15 5l-7 7 7 7') + '</button><div class="hj-lightbox__img" data-img></div><button class="hj-lightbox__btn hj-lightbox__side hj-lightbox__side--next" type="button" data-next aria-label="Next image">' + P('M9 5l7 7-7 7') + '</button></div>'
        + '<div class="hj-lightbox__foot"><p class="hj-lightbox__cap" data-cap></p><div class="hj-lightbox__bar" role="toolbar" aria-label="Image controls">'
        + '<button class="hj-lightbox__btn hj-lightbox__phone" type="button" data-prev aria-label="Previous image">' + P('M15 5l-7 7 7 7') + '</button><span class="hj-lightbox__sep hj-lightbox__phone" aria-hidden="true"></span>'
        + '<button class="hj-lightbox__btn" type="button" data-out aria-label="Zoom out">' + P('M5 12h14') + '</button><span class="hj-lightbox__level" data-level aria-live="polite">fit</span>'
        + '<button class="hj-lightbox__btn" type="button" data-in aria-label="Zoom in">' + P('M12 5v14M5 12h14') + '</button><span class="hj-lightbox__sep" aria-hidden="true"></span>'
        + '<button class="hj-lightbox__btn" type="button" data-fit aria-label="Fit to screen" title="Fit to screen">' + P('M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5') + '</button>'
        + '<span class="hj-lightbox__sep hj-lightbox__phone" aria-hidden="true"></span><button class="hj-lightbox__btn hj-lightbox__phone" type="button" data-next aria-label="Next image">' + P('M9 5l7 7-7 7') + '</button></div></div>';
      document.body.appendChild(box);
    }
    var q = function (s) { return box.querySelector(s); }, qa = function (s) { return box.querySelectorAll(s); };
    var stage = q('[data-stage]'), holder = q('[data-img]'), st = { i: 0, z: 1, tx: 0, ty: 0 }, opener = null, pts = {}, start = null, pinch = null, hintT;
    var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    function apply(anim) {
      holder.style.transition = anim === false ? 'none' : '';
      holder.style.transform = 'translate(' + st.tx + 'px,' + st.ty + 'px) scale(' + st.z + ')';
      q('[data-level]').textContent = st.z <= 1.001 ? 'fit' : Math.round(st.z * 100) + '%';
      q('[data-out]').setAttribute('aria-disabled', st.z <= 1.001 ? 'true' : 'false');
      q('[data-fit]').setAttribute('aria-disabled', st.z <= 1.001 ? 'true' : 'false');
      q('[data-in]').setAttribute('aria-disabled', st.z >= 3.999 ? 'true' : 'false');
      stage.classList.toggle('is-fit', st.z <= 1.001);
    }
    function clamp(z, tx, ty) {
      var im = holder.firstElementChild; if (!im) return [tx, ty];
      var r = im.getBoundingClientRect(), bw = r.width / st.z, bh = r.height / st.z;
      var mx = Math.max(0, (bw * z - stage.clientWidth) / 2 + 24), my = Math.max(0, (bh * z - stage.clientHeight) / 2 + 24);
      return [Math.max(-mx, Math.min(mx, tx)), Math.max(-my, Math.min(my, ty))];
    }
    function setZoom(z, tx, ty) { z = Math.max(1, Math.min(4, z)); var c = z <= 1.001 ? [0, 0] : clamp(z, tx, ty); st.z = z; st.tx = c[0]; st.ty = c[1]; apply(); }
    function zoomAt(f, cx, cy) { var k = Math.max(1, Math.min(4, st.z * f)) / st.z; setZoom(st.z * k, cx - (cx - st.tx) * k, cy - (cy - st.ty) * k); }
    function rel(x, y) { var r = stage.getBoundingClientRect(); return [x - r.left - r.width / 2, y - r.top - r.height / 2]; }
    function show(i) {
      st.i = Math.max(0, Math.min(all.length - 1, i)); st.z = 1; st.tx = 0; st.ty = 0;
      var b = all[st.i], src = b.querySelector('img, svg'), fig = b.closest('figure'), cap = fig && fig.querySelector('figcaption');
      var full = b.getAttribute('data-hj-full');
      holder.innerHTML = '';
      if (full) { var img = new Image(); img.src = full; img.alt = (src && src.getAttribute('alt')) || ''; holder.appendChild(img); }
      else if (src) holder.appendChild(src.cloneNode(true));
      q('[data-cap]').textContent = cap ? cap.textContent : '';
      q('[data-count]').textContent = all.length > 1 ? (st.i + 1) + ' / ' + all.length : '';
      box.setAttribute('aria-label', b.getAttribute('aria-label') || 'Image');
      Array.prototype.forEach.call(qa('[data-prev]'), function (e) { e.setAttribute('aria-disabled', st.i === 0 ? 'true' : 'false'); e.hidden = all.length < 2; });
      Array.prototype.forEach.call(qa('[data-next]'), function (e) { e.setAttribute('aria-disabled', st.i === all.length - 1 ? 'true' : 'false'); e.hidden = all.length < 2; });
      apply(false);
    }
    function open(i) {
      opener = document.activeElement; show(i); box.hidden = false; document.documentElement.style.overflow = 'hidden';
      var h = q('[data-hint]'); h.textContent = touch ? 'pinch to zoom' : 'scroll or press + and − to zoom, drag to move, esc to close'; h.classList.remove('is-gone');
      clearTimeout(hintT); hintT = setTimeout(function () { h.classList.add('is-gone'); }, 3200);
      q('[data-close]').focus();
    }
    function close() { box.hidden = true; document.documentElement.style.overflow = ''; if (opener && opener.focus) opener.focus(); }
    function go(d) { var n = st.i + d; if (n >= 0 && n < all.length) show(n); }
    if (!box._hjWired) {
      box._hjWired = true;
      q('[data-close]').addEventListener('click', close);
      Array.prototype.forEach.call(qa('[data-prev]'), function (e) { e.addEventListener('click', function () { go(-1); }); });
      Array.prototype.forEach.call(qa('[data-next]'), function (e) { e.addEventListener('click', function () { go(1); }); });
      q('[data-in]').addEventListener('click', function () { zoomAt(1.5, 0, 0); });
      q('[data-out]').addEventListener('click', function () { zoomAt(1 / 1.5, 0, 0); });
      q('[data-fit]').addEventListener('click', function () { setZoom(1, 0, 0); });
      stage.addEventListener('wheel', function (e) { e.preventDefault(); var p = rel(e.clientX, e.clientY); zoomAt(Math.exp(-e.deltaY * 0.0022), p[0], p[1]); }, { passive: false });
      stage.addEventListener('dblclick', function (e) { if (e.target.closest('button')) return; var p = rel(e.clientX, e.clientY); if (st.z > 1.001) setZoom(1, 0, 0); else zoomAt(2, p[0], p[1]); });
      stage.addEventListener('click', function (e) { if (e.target === stage && st.z <= 1.001) close(); });
      stage.addEventListener('pointerdown', function (e) {
        if (e.target.closest('button')) return;
        pts[e.pointerId] = [e.clientX, e.clientY];
        var ids = Object.keys(pts);
        if (ids.length === 1) start = { x: e.clientX, y: e.clientY, tx: st.tx, ty: st.ty };
        if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: st.z }; }
        stage.classList.add('is-dragging');
      });
      window.addEventListener('pointermove', function (e) {
        if (!pts[e.pointerId]) return;
        pts[e.pointerId] = [e.clientX, e.clientY];
        var ids = Object.keys(pts);
        if (ids.length === 2 && pinch) { var a = pts[ids[0]], b = pts[ids[1]], p = rel((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); zoomAt(pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d / st.z, p[0], p[1]); return; }
        if (!start) return;
        var dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (st.z > 1.001) { var c = clamp(st.z, start.tx + dx, start.ty + dy); st.tx = c[0]; st.ty = c[1]; apply(false); }
        else { st.ty = dy > 0 ? dy * 0.6 : 0; apply(false); }
      });
      var up = function (e) {
        if (!pts[e.pointerId]) return;
        if (start && Object.keys(pts).length === 1 && st.z <= 1.001) {
          var dx = e.clientX - start.x, dy = e.clientY - start.y;
          st.ty = 0; apply();
          if (dy > 110 && Math.abs(dx) < 80) close();
          else if (Math.abs(dx) > 80 && Math.abs(dy) < 60) go(dx < 0 ? 1 : -1);
        }
        delete pts[e.pointerId];
        if (Object.keys(pts).length < 2) pinch = null;
        if (!Object.keys(pts).length) { start = null; stage.classList.remove('is-dragging'); }
      };
      window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      document.addEventListener('keydown', function (e) {
        if (box.hidden) return;
        if (e.key === 'Escape') close();
        else if (e.key === '+' || e.key === '=') zoomAt(1.5, 0, 0);
        else if (e.key === '-' || e.key === '_') zoomAt(1 / 1.5, 0, 0);
        else if (e.key === '0') setZoom(1, 0, 0);
        else if (e.key === 'ArrowRight') go(1);
        else if (e.key === 'ArrowLeft') go(-1);
        else if (e.key === 'Tab') {
          var f = Array.prototype.filter.call(box.querySelectorAll('button'), function (b) { return b.offsetParent && b.getAttribute('aria-disabled') !== 'true'; });
          if (!f.length) return;
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    }
    items.forEach(function (b) { b._hjLb = true; b.addEventListener('click', function () { all = Array.prototype.slice.call(document.querySelectorAll('.hj-zoomable')); open(all.indexOf(b)); }); });
  }

  /* copyText(btn): a button with data-hj-copy="text" copies that text and says "copied" for 1.6s */
  function copyText(btn) {
    if (btn._hjCopyT) return; btn._hjCopyT = true;
    var label = btn.querySelector('span') || btn, orig = label.textContent;
    btn.addEventListener('click', function () {
      (navigator.clipboard ? navigator.clipboard.writeText(btn.getAttribute('data-hj-copy')) : Promise.reject()).then(function () {
        btn.classList.add('is-done'); label.textContent = 'copied';
        setTimeout(function () { btn.classList.remove('is-done'); label.textContent = orig; }, 1600);
      }, function () {});
    });
  }

  /* init(root): wires everything marked up inside root */
  function init(root) {
    root = root || document;
    Array.prototype.forEach.call(root.querySelectorAll('[data-hj-theme]'), themeToggle);
    Array.prototype.forEach.call(root.querySelectorAll('.hj-hero'), field);
    Array.prototype.forEach.call(root.querySelectorAll('.hj-cue'), cue);
    Array.prototype.forEach.call(root.querySelectorAll('.hj-btn'), wipe);
    Array.prototype.forEach.call(root.querySelectorAll('[data-hj-nav]'), function (el) { nav(el); });
    Array.prototype.forEach.call(root.querySelectorAll('[data-hj-draw]'), function (el) {
      var svg = el.matches('svg') ? el : el.querySelector('.hj-mark');
      if (!svg || svg._hjDrawBound) return;
      svg._hjDrawBound = true;
      if (el.getAttribute('data-hj-draw') === 'view' && window.IntersectionObserver) {
        var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); draw(svg); } }, { threshold: 0.6 });
        io.observe(el);
      } else draw(svg);
      el.addEventListener('pointerenter', function () { if (!svg._hjStop) draw(svg); });
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-hj-swipe]'), swipe);
    Array.prototype.forEach.call(root.querySelectorAll('.hj-switch'), switcher);
    Array.prototype.forEach.call(root.querySelectorAll('.hj-ticker'), ticker);
    Array.prototype.forEach.call(root.querySelectorAll('.hj-book'), booking);
    Array.prototype.forEach.call(root.querySelectorAll('.hj-toc'), toc);
    Array.prototype.forEach.call(root.querySelectorAll('.hj-codeblock__copy'), copyCode);
    lightbox(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-hj-copy]'), copyText);
  }

  window.HJ = { markSvg: markSvg, draw: draw, wipe: wipe, demoWipe: demoWipe, nav: nav, field: field, cue: cue, themeToggle: themeToggle, setTheme: setTheme, swipe: swipe, switcher: switcher, ticker: ticker, booking: booking, toc: toc, copyCode: copyCode, lightbox: lightbox, copyText: copyText, init: init, reducedMotion: reduced };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
})();
