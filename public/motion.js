/* =========================================================================
   motion.js  ·  Cinematic motion layer for nycfireplaces.com
   Vanilla JS, zero dependencies, defer-loaded. Opt-in via data-fx on images.
   Effects: flames, embers, shimmer, kenburns, reveal (space-combinable).
   All comments use hyphens, not em dashes (per spec).
   ========================================================================= */
(function () {
  'use strict';

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Low-power heuristic: few cores => skip the expensive displacement layer.
  var LOW_POWER = (navigator.hardwareConcurrency || 4) <= 4;

  // ---- Shared SVG turbulence filter (one per document) -------------------
  function ensureFilter() {
    if (document.getElementById('fx-flame-filter')) return;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0';
    // Fine vertical-biased turbulence, animated seed + baseFrequency so the
    // flames lick and never loop visibly. Low displacement scale = subtle,
    // realistic movement rather than a smeary wobble.
    svg.innerHTML =
      '<filter id="fx-flame-filter" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="4" result="n">' +
      '<animate attributeName="baseFrequency" dur="7s" values="0.012 0.03;0.016 0.045;0.012 0.03" repeatCount="indefinite"/>' +
      '<animate attributeName="seed" values="4;14;4" dur="5s" repeatCount="indefinite"/></feTurbulence>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>';
    document.body.appendChild(svg);
  }

  function parseRect(el) {
    var r = (el.getAttribute('data-flame-rect') || '').split(',').map(parseFloat);
    if (r.length === 4 && r.every(function (n) { return !isNaN(n); })) {
      return { x: r[0], y: r[1], w: r[2], h: r[3], guessed: false };
    }
    // Centered default when unknown; flagged for NEEDS_CALIBRATION.
    return { x: 33, y: 45, w: 34, h: 22, guessed: true };
  }

  // ---- Wrap an <img> so overlays can be absolutely positioned ------------
  function wrap(img) {
    if (img.parentElement && img.parentElement.classList.contains('fx-wrap')) {
      return img.parentElement;
    }
    var w = document.createElement('span');
    w.className = 'fx-wrap';
    // Inherit the image's own box so we never introduce layout shift.
    var cs = getComputedStyle(img);
    w.style.borderRadius = cs.borderRadius;
    img.parentNode.insertBefore(w, img);
    w.appendChild(img);
    return w;
  }

  // Parse one or many flame regions. Supports:
  //   data-flame-rect ="x,y,w,h"                         (single)
  //   data-flame-rects="x,y,w,h,intensity; x,y,w,h; ..."  (multiple)
  function parseRects(img, defaultIntensity) {
    var multi = img.getAttribute('data-flame-rects');
    if (multi) {
      return multi.split(';').map(function (chunk) {
        var v = chunk.trim().split(',');
        return {
          x: parseFloat(v[0]), y: parseFloat(v[1]), w: parseFloat(v[2]), h: parseFloat(v[3]),
          intensity: (v[4] || defaultIntensity).trim(), guessed: false,
        };
      }).filter(function (r) { return !isNaN(r.x) && !isNaN(r.w); });
    }
    var r = parseRect(img);
    r.intensity = defaultIntensity;
    return [r];
  }

  // ---- Effect: flames (one or many regions per image) --------------------
  function buildRegion(wrapEl, img, rect, shape) {
    var region = document.createElement('div');
    region.className = 'fx-flames fx-intensity-' + rect.intensity;
    if (shape === 'arch') region.setAttribute('data-shape', 'arch');
    region.style.left = rect.x + '%';
    region.style.top = rect.y + '%';
    region.style.width = rect.w + '%';
    region.style.height = rect.h + '%';

    // Two flicker glows over the REAL photographed flames. We deliberately do
    // NOT distort a slice of the photo (that reads as blurry). The photo stays
    // crisp; the glows just make its fire pulse with warm light.
    var glow = document.createElement('div'); glow.className = 'fx-glow';
    var glowOuter = document.createElement('div'); glowOuter.className = 'fx-glow-outer';
    region.appendChild(glow);
    region.appendChild(glowOuter);
    wrapEl.appendChild(region);

    // Light-spill onto surrounding surfaces (larger than the fire).
    var spill = document.createElement('div');
    spill.className = 'fx-spill fx-intensity-' + rect.intensity;
    var pad = 14;
    spill.style.left = Math.max(0, rect.x - pad) + '%';
    spill.style.top = Math.max(0, rect.y - pad) + '%';
    spill.style.width = Math.min(100, rect.w + pad * 2) + '%';
    spill.style.height = Math.min(100, rect.h + pad * 2) + '%';
    wrapEl.insertBefore(spill, wrapEl.firstChild.nextSibling);
  }

  // Glow-only hotspots (e.g. infrared patio heaters): pulsing, no flames.
  function buildGlowSpots(wrapEl, img) {
    var spec = img.getAttribute('data-glow-rects');
    if (!spec) return;
    spec.split(';').forEach(function (chunk) {
      var v = chunk.trim().split(',').map(parseFloat);
      if (v.length < 4 || isNaN(v[0])) return;
      var g = document.createElement('div');
      g.className = 'fx-heater';
      g.style.left = v[0] + '%'; g.style.top = v[1] + '%';
      g.style.width = v[2] + '%'; g.style.height = v[3] + '%';
      wrapEl.appendChild(g);
    });
  }

  // Full-resolution live-flame layer: an exact copy of the photo, wobbled by a
  // gentle turbulence displacement, masked to ONLY the fire regions. Native
  // resolution (no upscaled crop) so the moving fire stays crisp.
  function buildLiveFlame(wrapEl, img, rects) {
    if (REDUCED || LOW_POWER) return;
    var layer = document.createElement('div');
    layer.className = 'fx-liveflame';
    var src = img.currentSrc || img.src;
    layer.style.backgroundImage = 'url("' + src + '")';
    var mask = rects.map(function (r) {
      var cx = (r.x + r.w / 2).toFixed(1), cy = (r.y + r.h / 2).toFixed(1);
      // Radius a touch larger than the rect, feathered out to transparent.
      return 'radial-gradient(' + (r.w * 0.62).toFixed(1) + '% ' + (r.h * 0.62).toFixed(1) +
        '% at ' + cx + '% ' + cy + '%, #000 55%, transparent 100%)';
    }).join(', ');
    layer.style.webkitMaskImage = mask;
    layer.style.maskImage = mask;
    wrapEl.insertBefore(layer, wrapEl.firstChild.nextSibling);
  }

  function initFlames(img, fx) {
    var wrapEl = wrap(img);
    var defaultIntensity = img.getAttribute('data-flame-intensity') || 'med';
    var shape = img.getAttribute('data-flame-shape') || 'rect';
    var rects = parseRects(img, defaultIntensity);

    buildLiveFlame(wrapEl, img, rects);
    rects.forEach(function (rect) { buildRegion(wrapEl, img, rect, shape); });
    buildGlowSpots(wrapEl, img);

    // Reveal slices only once the image has decoded (avoids a flash).
    if (img.complete) wrapEl.classList.add('fx-ready');
    else img.addEventListener('load', function () { wrapEl.classList.add('fx-ready'); }, { once: true });

    if (fx.indexOf('embers') !== -1) initEmbers(wrapEl, rects, defaultIntensity);
    return wrapEl;
  }

  // ---- Effect: embers (one canvas per image, emits from every region) ----
  function initEmbers(wrapEl, rects, intensity) {
    if (REDUCED) return;
    if (!Array.isArray(rects)) rects = [rects];
    var canvas = document.createElement('canvas');
    canvas.className = 'fx-embers-canvas';
    wrapEl.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var per = intensity === 'high' ? 25 : intensity === 'low' ? 10 : 18;
    var cap = per * rects.length; // scale to number of fires
    var parts = [], W = 0, H = 0, raf = null, onscreen = false;

    function size() { W = canvas.width = wrapEl.clientWidth; H = canvas.height = wrapEl.clientHeight; }
    function spawn() {
      var rect = rects[(Math.random() * rects.length) | 0];
      return {
        x: (rect.x + Math.random() * rect.w) / 100 * W,
        y: (rect.y + rect.h) / 100 * H,
        r: 0.6 + Math.random() * 1.8,
        vy: 0.3 + Math.random() * 0.7,
        vx: (Math.random() - 0.5) * 0.4,
        life: 0, max: 90 + Math.random() * 120,
      };
    }
    function tick() {
      if (!onscreen || document.hidden) { raf = null; return; }
      ctx.clearRect(0, 0, W, H);
      if (parts.length < cap && Math.random() > 0.4) parts.push(spawn());
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.life++; p.y -= p.vy; p.x += p.vx;
        var fade = 1 - p.life / p.max;
        if (fade <= 0) { parts.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = 'hsla(30,100%,62%,' + (fade * 0.85).toFixed(3) + ')';
        ctx.shadowColor = 'rgba(255,150,60,' + fade + ')';
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(tick);
    }
    size();
    addEventListener('resize', size);
    var io = new IntersectionObserver(function (e) {
      onscreen = e[0].isIntersecting;
      if (onscreen && !raf) tick();
    }, { threshold: 0.05 });
    io.observe(wrapEl);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && onscreen && !raf) tick();
    });
  }

  // ---- Effect: heat shimmer ---------------------------------------------
  function initShimmer(img) {
    if (REDUCED) return;
    var supported = CSS && CSS.supports && (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)'));
    if (!supported) return; // skip entirely, no fallback that could look wrong
    var wrapEl = wrap(img);
    var rect = parseRect(img);
    var band = document.createElement('div');
    band.className = 'fx-shimmer';
    band.style.left = Math.max(0, rect.x - 4) + '%';
    band.style.width = Math.min(100, rect.w + 8) + '%';
    band.style.top = Math.max(0, rect.y - rect.h * 0.9) + '%';
    band.style.height = rect.h + '%';
    wrapEl.appendChild(band);
  }

  // ---- Effect: Ken Burns -------------------------------------------------
  var kbCount = 0;
  function initKenBurns(img) {
    if (REDUCED) return;
    function go() {
      img.classList.add('fx-kenburns');
      if (kbCount++ % 2) img.classList.add('fx-kb-rev');
    }
    // Never animate the LCP/hero image until after load, to protect LCP.
    if (document.readyState === 'complete') go();
    else addEventListener('load', go, { once: true });
  }

  // ---- Effect: scroll reveal --------------------------------------------
  var revealIO;
  function initReveal(el) {
    if (REDUCED) { el.classList.add('fx-in'); return; }
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            var sibs = en.target.parentElement ? en.target.parentElement.children : [en.target];
            var idx = Array.prototype.indexOf.call(sibs, en.target);
            en.target.style.transitionDelay = Math.min(idx, 6) * 100 + 'ms';
            en.target.classList.add('fx-in');
            revealIO.unobserve(en.target);
          }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    }
    revealIO.observe(el);
  }

  // ---- Boot --------------------------------------------------------------
  function boot() {
    var nodes = document.querySelectorAll('[data-fx]');
    if (!nodes.length) return;
    ensureFilter();
    nodes.forEach(function (el) {
      try {
        var fx = (el.getAttribute('data-fx') || '').split(/\s+/);
        var isImg = el.tagName === 'IMG';
        if (isImg && fx.indexOf('flames') !== -1) initFlames(el, fx);
        if (isImg && fx.indexOf('shimmer') !== -1) initShimmer(el);
        if (isImg && fx.indexOf('kenburns') !== -1) initKenBurns(el);
        if (fx.indexOf('reveal') !== -1) initReveal(el);
      } catch (err) {
        /* fail silently per spec; a missing rect or img must never break the page */
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
