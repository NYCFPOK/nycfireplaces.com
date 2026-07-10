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
    svg.innerHTML =
      '<filter id="fx-flame-filter" x="-20%" y="-20%" width="140%" height="140%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.02 0.06" numOctaves="2" seed="2" result="n">' +
      '<animate attributeName="seed" values="2;9;2" dur="6s" repeatCount="indefinite"/></feTurbulence>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="10" xChannelSelector="R" yChannelSelector="G"/>' +
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

  // ---- Effect: flames ----------------------------------------------------
  function initFlames(img, fx) {
    var wrapEl = wrap(img);
    var rect = parseRect(img);
    var intensity = img.getAttribute('data-flame-intensity') || 'med';
    var shape = img.getAttribute('data-flame-shape') || 'rect';

    var region = document.createElement('div');
    region.className = 'fx-flames fx-intensity-' + intensity;
    if (shape === 'arch') region.setAttribute('data-shape', 'arch');
    region.style.left = rect.x + '%';
    region.style.top = rect.y + '%';
    region.style.width = rect.w + '%';
    region.style.height = rect.h + '%';

    // Displacement slice: a copy of the photo's flame region, wobbled.
    if (!REDUCED && !LOW_POWER) {
      var slice = document.createElement('div');
      slice.className = 'fx-slice';
      var src = img.currentSrc || img.src;
      slice.style.backgroundImage = 'url("' + src + '")';
      slice.style.backgroundSize = (10000 / rect.w) + '% ' + (10000 / rect.h) + '%';
      slice.style.backgroundPosition =
        (rect.x / (100 - rect.w) * 100) + '% ' + (rect.y / (100 - rect.h) * 100) + '%';
      slice.style.filter = 'url(#fx-flame-filter) saturate(1.15) brightness(1.05)';
      region.appendChild(slice);
    }

    var glow = document.createElement('div'); glow.className = 'fx-glow';
    var glowOuter = document.createElement('div'); glowOuter.className = 'fx-glow-outer';
    region.appendChild(glow);
    region.appendChild(glowOuter);
    wrapEl.appendChild(region);

    // Light-spill onto surrounding surfaces (larger than the firebox).
    var spill = document.createElement('div');
    spill.className = 'fx-spill fx-intensity-' + intensity;
    var pad = 14;
    spill.style.left = Math.max(0, rect.x - pad) + '%';
    spill.style.top = Math.max(0, rect.y - pad) + '%';
    spill.style.width = Math.min(100, rect.w + pad * 2) + '%';
    spill.style.height = Math.min(100, rect.h + pad * 2) + '%';
    wrapEl.insertBefore(spill, wrapEl.firstChild.nextSibling);

    // Reveal the slice only once the image has decoded (avoids a flash).
    if (img.complete) wrapEl.classList.add('fx-ready');
    else img.addEventListener('load', function () { wrapEl.classList.add('fx-ready'); }, { once: true });

    if (fx.indexOf('embers') !== -1) initEmbers(wrapEl, rect, intensity);
    return wrapEl;
  }

  // ---- Effect: embers (canvas per tagged image) --------------------------
  function initEmbers(wrapEl, rect, intensity) {
    if (REDUCED) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'fx-embers-canvas';
    wrapEl.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var cap = intensity === 'high' ? 25 : intensity === 'low' ? 10 : 18;
    var parts = [], W = 0, H = 0, raf = null, onscreen = false;

    function size() { W = canvas.width = wrapEl.clientWidth; H = canvas.height = wrapEl.clientHeight; }
    function spawn() {
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
