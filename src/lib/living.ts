// Living fire: one small canvas engine for every <LivingImage>.
//
// Effects are drawn on a transparent canvas laid over a real photo and blended
// with "screen", so they only ever add light where the photo already has fire.
// Rules enforced here:
//   - runs only while the image is on screen and the tab is visible
//   - prefers-reduced-motion, Save-Data and low-power devices get one still lit frame
//   - canvas resolution is capped (device pixel ratio 2, 1400 px wide)
//   - "ignite": the first time a fire scrolls into view it fades from off to burning, once
export type EffectType = 'flames' | 'embers' | 'glow' | 'shimmer' | 'smoke';
export interface Effect { t: EffectType; r: [number, number, number, number]; i?: number }

/** How the photo sits inside its box (object-fit: cover), as fractions of the box. */
export function fit(el: HTMLElement) {
  const img = el.querySelector('img');
  const box = el.getBoundingClientRect();
  if (!img || !img.naturalWidth || !box.width || !box.height) return { ox: 0, oy: 0, sx: 1, sy: 1 };
  const ir = img.naturalWidth / img.naturalHeight, br = box.width / box.height;
  const pos = getComputedStyle(img).objectPosition.split(' ').map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5));
  if (ir > br) { const sx = ir / br; return { ox: (1 - sx) * (pos[0] ?? 0.5), oy: 0, sx, sy: 1 }; }
  const sy = br / ir; return { ox: 0, oy: (1 - sy) * (pos[1] ?? 0.5), sx: 1, sy };
}
/** Image-percent rectangle -> box-percent rectangle. */
export function toBox(el: HTMLElement, r: number[]): [number, number, number, number] {
  const f = fit(el);
  return [f.ox * 100 + r[0] * f.sx, f.oy * 100 + r[1] * f.sy, r[2] * f.sx, r[3] * f.sy];
}
/** Box-percent rectangle -> image-percent rectangle. */
export function fromBox(el: HTMLElement, r: number[]): [number, number, number, number] {
  const f = fit(el);
  return [(r[0] - f.ox * 100) / f.sx, (r[1] - f.oy * 100) / f.sy, r[2] / f.sx, r[3] / f.sy];
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number }
interface Instance {
  el: HTMLElement; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; effects: Effect[]; raw: Effect[];
  visible: boolean; ignite: number; ignited: boolean; particles: Map<number, Particle[]>; w: number; h: number; shimmer: HTMLElement[];
}

const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowPower = Boolean(nav.connection?.saveData) || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) || (navigator.hardwareConcurrency || 8) <= 2;
export const isStatic = reduced || lowPower;

const instances: Instance[] = [];
let raf = 0;
let last = 0;

// Cheap smooth noise in 0..1.
const hash = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const noise = (x: number) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };

function size(inst: Instance) {
  const rect = inst.el.getBoundingClientRect();
  const scale = Math.min(Math.min(devicePixelRatio || 1, 2), 1400 / Math.max(rect.width, 1));
  inst.w = Math.max(1, Math.round(rect.width * scale));
  inst.h = Math.max(1, Math.round(rect.height * scale));
  inst.canvas.width = inst.w;
  inst.canvas.height = inst.h;
  inst.effects = inst.raw.map((e) => ({ ...e, r: toBox(inst.el, e.r) }));
}

function drawFlames(inst: Instance, e: Effect, idx: number, t: number, k: number) {
  const { ctx, w, h } = inst;
  const [x, y, rw, rh] = [e.r[0] / 100 * w, e.r[1] / 100 * h, e.r[2] / 100 * w, e.r[3] / 100 * h];
  const power = (e.i ?? 1) * k;
  const flick = 0.75 + 0.25 * noise(t * 2.3 + idx * 9);
  // Warm light spilling onto the surfaces around the fire, pulsing with the flame.
  const cx = x + rw / 2, cy = y + rh * 0.6, rad = Math.max(rw, rh * 2) * 1.5;
  const spill = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
  spill.addColorStop(0, `rgba(255,150,60,${0.16 * power * flick})`);
  spill.addColorStop(0.4, `rgba(255,110,40,${0.07 * power * flick})`);
  spill.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = spill;
  ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  // Soft tongues of light that flicker over the real flames. Deliberately faint
  // and narrow: this adds life to fire that is already in the photo, it does not paint a new one.
  const tongues = Math.max(7, Math.min(34, Math.round(rw / Math.max(rh * 0.16, 4))));
  const base = y + rh;
  const slot = rw / tongues;
  for (let j = 0; j < tongues; j++) {
    const seed = idx * 31 + j * 7.3;
    const live = noise(t * 1.1 + seed * 3.3);
    if (live < 0.28) continue; // gaps open and close along the burner
    const fx = x + (j + 0.5) * slot + (noise(t * 0.9 + seed) - 0.5) * slot;
    const fh = rh * (0.3 + 0.6 * noise(t * 2.6 + seed * 1.7)) * (0.5 + 0.5 * k);
    const fw = slot * (0.35 + 0.35 * noise(t * 1.3 + seed * 0.6));
    const sway = (noise(t * 1.7 + seed * 2.1) - 0.5) * fw * 2;
    const a = power * (0.1 + 0.12 * live);
    const g = ctx.createLinearGradient(0, base, 0, base - fh);
    g.addColorStop(0, `rgba(255,205,130,${a})`);
    g.addColorStop(0.5, `rgba(255,150,60,${a * 0.7})`);
    g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(fx - fw, base);
    ctx.bezierCurveTo(fx - fw * 1.1, base - fh * 0.45, fx - fw * 0.15 + sway, base - fh * 0.8, fx + sway, base - fh);
    ctx.bezierCurveTo(fx + fw * 0.15 + sway, base - fh * 0.8, fx + fw * 1.1, base - fh * 0.45, fx + fw, base);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGlow(inst: Instance, e: Effect, idx: number, t: number, k: number) {
  const { ctx, w, h } = inst;
  const cx = (e.r[0] + e.r[2] / 2) / 100 * w, cy = (e.r[1] + e.r[3] / 2) / 100 * h;
  const rx = e.r[2] / 100 * w, ry = e.r[3] / 100 * h, rad = Math.max(rx, ry) * 0.9;
  const breathe = 0.7 + 0.3 * Math.sin(t * 0.9 + idx * 2.1) * (isStatic ? 0 : 1);
  const a = 0.26 * (e.i ?? 1) * k * breathe;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(Math.max(rx / Math.max(ry, 1), 0.2) > 1 ? 1 : rx / Math.max(ry, 1), ry > rx ? 1 : ry / Math.max(rx, 1));
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
  g.addColorStop(0, `rgba(255,150,70,${a})`);
  g.addColorStop(0.5, `rgba(255,105,40,${a * 0.45})`);
  g.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawParticles(inst: Instance, e: Effect, idx: number, dt: number, k: number) {
  const { ctx, w, h } = inst;
  const smoke = e.t === 'smoke';
  const list = inst.particles.get(idx) ?? [];
  inst.particles.set(idx, list);
  const [x, y, rw, rh] = [e.r[0] / 100 * w, e.r[1] / 100 * h, e.r[2] / 100 * w, e.r[3] / 100 * h];
  const cap = smoke ? 5 : 7;
  if (!isStatic && k > 0.6 && list.length < cap && Math.random() < dt * (smoke ? 0.9 : 1.4) * (e.i ?? 1)) {
    list.push({
      x: x + Math.random() * rw, y: y + rh * (smoke ? 0.2 : 0.7),
      vx: (Math.random() - 0.5) * rw * 0.06, vy: -(rh * (smoke ? 0.5 : 0.9) + h * 0.03) * (0.6 + Math.random() * 0.6),
      life: 0, max: smoke ? 5 + Math.random() * 3 : 2.4 + Math.random() * 2.2, size: smoke ? Math.max(rw * 0.22, 10) : Math.max(1.1, w / 900) * (0.7 + Math.random() * 0.9),
    });
  }
  for (let j = list.length - 1; j >= 0; j--) {
    const p = list[j];
    p.life += dt;
    if (p.life > p.max) { list.splice(j, 1); continue; }
    p.x += (p.vx + Math.sin(p.life * 2 + j) * (smoke ? 3 : 5)) * dt;
    p.y += p.vy * dt;
    const f = p.life / p.max, fade = Math.sin(Math.PI * f);
    if (smoke) {
      const r = p.size * (1 + f * 2.2);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(190,190,195,${0.07 * fade * (e.i ?? 1)})`);
      g.addColorStop(1, 'rgba(190,190,195,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = `rgba(255,${150 + Math.round(70 * (1 - f))},70,${0.85 * fade})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function draw(inst: Instance, t: number, dt: number) {
  const { ctx, w, h } = inst;
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  const k = inst.ignite;
  inst.effects.forEach((e, idx) => {
    if (e.t === 'flames') drawFlames(inst, e, idx, t, k);
    else if (e.t === 'glow') drawGlow(inst, e, idx, t, k);
    else if (e.t === 'embers' || e.t === 'smoke') drawParticles(inst, e, idx, dt, k);
  });
}

function frame(now: number) {
  raf = 0;
  const dt = Math.min((now - last) / 1000, 0.1);
  if (dt < 1 / 32) { schedule(); return; } // ~30 fps is plenty for fire and halves the work
  last = now;
  let active = false;
  for (const inst of instances) {
    if (!inst.visible) continue;
    active = true;
    if (inst.ignite < 1) inst.ignite = Math.min(1, inst.ignite + dt / 1.6);
    draw(inst, now / 1000, dt);
  }
  if (active) schedule();
}
function schedule() { if (!raf && !document.hidden && !isStatic) raf = requestAnimationFrame(frame); }

function buildShimmer(inst: Instance) {
  inst.shimmer.forEach((n) => n.remove());
  inst.shimmer = [];
  if (isStatic || !matchMedia('(min-width: 768px) and (pointer: fine)').matches) return; // displacement is desktop only
  const img = inst.el.querySelector('img');
  if (!img) return;
  inst.effects.filter((e) => e.t === 'shimmer').forEach((e) => {
    const d = document.createElement('div');
    d.className = 'living-shimmer';
    const box = inst.el.getBoundingClientRect(), f = fit(inst.el);
    d.style.cssText = `left:${e.r[0]}%;top:${e.r[1]}%;width:${e.r[2]}%;height:${e.r[3]}%;background-image:url("${img.currentSrc || img.src}");background-size:${f.sx * box.width}px ${f.sy * box.height}px;background-position:${(f.ox - e.r[0] / 100) * box.width}px ${(f.oy - e.r[1] / 100) * box.height}px`;
    inst.el.appendChild(d);
    inst.shimmer.push(d);
  });
  if (inst.shimmer.length && !document.getElementById('living-shimmer-filter')) {
    document.body.insertAdjacentHTML('beforeend', '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="living-shimmer-filter"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="1" seed="2"><animate attributeName="baseFrequency" dur="9s" values="0.012 0.05;0.016 0.07;0.012 0.05" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" scale="5"/></filter></svg>');
  }
}

export function refresh(el: HTMLElement) {
  const inst = instances.find((i) => i.el === el);
  if (!inst) return;
  inst.raw = JSON.parse(el.dataset.effects || '[]');
  inst.particles.clear();
  size(inst);
  buildShimmer(inst);
  draw(inst, performance.now() / 1000, 0);
  schedule();
}

export function init() {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const inst = instances.find((i) => i.el === entry.target);
      if (!inst) continue;
      inst.visible = entry.isIntersecting;
      if (entry.isIntersecting && !inst.ignited) {
        inst.ignited = true;
        inst.el.classList.add('is-lit');
        if (isStatic) { inst.ignite = 1; draw(inst, 12.34, 0); }
        const video = inst.el.querySelector<HTMLVideoElement>('video[data-src]');
        if (video && !isStatic) { video.src = video.dataset.src!; video.removeAttribute('data-src'); video.play().catch(() => {}); }
      }
      const playing = inst.el.querySelector<HTMLVideoElement>('video:not([data-src])');
      if (playing) entry.isIntersecting && !isStatic ? playing.play().catch(() => {}) : playing.pause();
    }
    schedule();
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

  document.querySelectorAll<HTMLElement>('[data-living]').forEach((el) => {
    if (instances.some((i) => i.el === el)) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'living-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    el.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const inst: Instance = { el, canvas, ctx, effects: [], raw: JSON.parse(el.dataset.effects || '[]'), visible: false, ignite: 0, ignited: false, particles: new Map(), w: 1, h: 1, shimmer: [] };
    instances.push(inst);
    size(inst);
    buildShimmer(inst);
    const img = el.querySelector('img');
    if (img && !img.complete) img.addEventListener('load', () => { size(inst); buildShimmer(inst); }, { once: true });
    io.observe(el);
    new ResizeObserver(() => { size(inst); if (isStatic && inst.ignited) draw(inst, 12.34, 0); }).observe(el);
  });
  document.addEventListener('visibilitychange', () => { last = performance.now(); schedule(); });
}
