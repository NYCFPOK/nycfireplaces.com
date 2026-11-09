// Calibration overlay for LivingImage effects. Open any page with ?calibrate=1
// (never available in production). Drag a box to move it, drag its corner to
// resize, then copy the values into the `effects` prop of that image.
import { refresh, type Effect, type EffectType } from './living';

const COLORS: Record<EffectType, string> = { flames: '#ff8a2a', embers: '#ffd24a', glow: '#ff5fa2', shimmer: '#4ad2ff', smoke: '#c8c8c8' };
const TYPES = Object.keys(COLORS) as EffectType[];
const round = (n: number) => Math.round(n * 10) / 10;

export function start() {
  const style = document.createElement('style');
  style.textContent = `
    .cal-box{position:absolute;border:2px solid var(--c);background:color-mix(in srgb,var(--c) 18%,transparent);cursor:move;z-index:5;touch-action:none;box-sizing:border-box}
    .cal-box span{position:absolute;left:0;top:-20px;background:var(--c);color:#000;font:600 11px/18px system-ui;padding:0 5px;white-space:nowrap}
    .cal-box i{position:absolute;right:-8px;bottom:-8px;width:16px;height:16px;background:var(--c);border-radius:50%;cursor:nwse-resize}
    .cal-box.sel{outline:2px solid #fff}
    .cal-ring{outline:3px dashed #fff;outline-offset:-3px}
    #cal-panel{position:fixed;right:12px;bottom:12px;z-index:9999;width:min(380px,calc(100vw - 24px));background:#111;color:#eee;font:13px/1.4 system-ui;border-radius:10px;padding:12px;box-shadow:0 10px 40px #000a}
    #cal-panel button{font:600 12px system-ui;margin:2px;padding:6px 9px;border-radius:6px;border:0;cursor:pointer;min-height:32px}
    #cal-panel textarea{width:100%;height:110px;margin-top:8px;background:#000;color:#9f9;border:1px solid #444;border-radius:6px;font:11px/1.4 ui-monospace,monospace;padding:6px}
  `;
  document.head.appendChild(style);
  const panel = document.createElement('div');
  panel.id = 'cal-panel';
  panel.innerHTML = `<strong>Fire calibration</strong><div id="cal-which" style="opacity:.75;margin:4px 0">Click an image to select it.</div>
    <div>${TYPES.map((t) => `<button data-add="${t}" style="background:${COLORS[t]}">+ ${t}</button>`).join('')}</div>
    <div><button data-act="del" style="background:#c33;color:#fff">Delete selected box</button><button data-act="copy" style="background:#fff">Copy values</button></div>
    <textarea readonly aria-label="Effect values"></textarea>`;
  document.body.appendChild(panel);
  const out = panel.querySelector('textarea')!;
  const which = panel.querySelector('#cal-which')!;
  let current: HTMLElement | null = null;
  let selected = -1;

  const read = (el: HTMLElement): Effect[] => JSON.parse(el.dataset.effects || '[]');
  const write = (el: HTMLElement, fx: Effect[]) => { el.dataset.effects = JSON.stringify(fx); refresh(el); show(); };
  const show = () => {
    if (!current) return;
    const fx = read(current);
    which.textContent = `Image: ${current.dataset.livingId || current.querySelector('img')?.alt?.slice(0, 50) || 'untitled'}`;
    out.value = 'effects={[\n' + fx.map((e) => `  { t: '${e.t}', r: [${e.r.join(', ')}]${e.i && e.i !== 1 ? `, i: ${e.i}` : ''} },`).join('\n') + '\n]}';
  };

  function render(el: HTMLElement) {
    el.querySelectorAll('.cal-box').forEach((n) => n.remove());
    read(el).forEach((e, idx) => {
      const box = document.createElement('div');
      box.className = 'cal-box' + (el === current && idx === selected ? ' sel' : '');
      box.style.cssText = `--c:${COLORS[e.t]};left:${e.r[0]}%;top:${e.r[1]}%;width:${e.r[2]}%;height:${e.r[3]}%`;
      box.innerHTML = `<span>${e.t} ${e.r.join(', ')}</span><i></i>`;
      box.addEventListener('pointerdown', (down) => {
        down.preventDefault(); down.stopPropagation();
        select(el, idx);
        const resize = (down.target as HTMLElement).tagName === 'I';
        const rect = el.getBoundingClientRect();
        const start = [...e.r];
        const move = (ev: PointerEvent) => {
          const dx = (ev.clientX - down.clientX) / rect.width * 100, dy = (ev.clientY - down.clientY) / rect.height * 100;
          const fx = read(el);
          fx[idx].r = resize
            ? [start[0], start[1], round(Math.max(1, Math.min(100 - start[0], start[2] + dx))), round(Math.max(1, Math.min(100 - start[1], start[3] + dy)))]
            : [round(Math.max(0, Math.min(100 - start[2], start[0] + dx))), round(Math.max(0, Math.min(100 - start[3], start[1] + dy))), start[2], start[3]];
          el.dataset.effects = JSON.stringify(fx);
          const r = fx[idx].r;
          box.style.left = r[0] + '%'; box.style.top = r[1] + '%'; box.style.width = r[2] + '%'; box.style.height = r[3] + '%';
          box.querySelector('span')!.textContent = `${e.t} ${r.join(', ')}`;
          refresh(el); show();
        };
        const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
        addEventListener('pointermove', move); addEventListener('pointerup', up);
      });
      el.appendChild(box);
    });
  }
  function select(el: HTMLElement, idx = -1) {
    document.querySelectorAll('.cal-ring').forEach((n) => n.classList.remove('cal-ring'));
    current = el; selected = idx;
    el.classList.add('cal-ring');
    document.querySelectorAll<HTMLElement>('[data-living]').forEach(render);
    show();
  }

  document.querySelectorAll<HTMLElement>('[data-living]').forEach((el) => {
    render(el);
    el.addEventListener('click', (ev) => { ev.preventDefault(); if (el !== current) select(el); }, true);
  });
  panel.addEventListener('click', async (ev) => {
    const btn = (ev.target as HTMLElement).closest('button');
    if (!btn || !current) return;
    const fx = read(current);
    if (btn.dataset.add) { fx.push({ t: btn.dataset.add as EffectType, r: [40, 45, 20, 10] }); selected = fx.length - 1; }
    else if (btn.dataset.act === 'del' && selected >= 0) { fx.splice(selected, 1); selected = -1; }
    else if (btn.dataset.act === 'copy') { await navigator.clipboard?.writeText(out.value).catch(() => {}); btn.textContent = 'Copied'; setTimeout(() => (btn.textContent = 'Copy values'), 1200); return; }
    write(current, fx);
    render(current);
  });
}
