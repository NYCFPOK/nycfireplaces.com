// The only site-wide client script. Two jobs:
//  1. Outcome tracking: push non-personal events to window.dataLayer.
//  2. Show "Open now / Closed" from the hours in site.json (America/New_York).
// Nothing here sends names, emails, phone numbers, files or free text anywhere.

declare global {
  interface Window { dataLayer?: Record<string, unknown>[] }
}

export function track(event: string, detail: Record<string, string> = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, page_path: location.pathname, ...detail });
}

document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-track]');
  if (!el) return;
  // phone_click is a click on a phone link, not a completed call.
  // directions_click is a click on a directions link, not a showroom visit.
  track(el.dataset.track!, { placement: el.dataset.placement || '' });
});

document.querySelectorAll<HTMLFormElement>('form[data-lead-form]').forEach((form) => {
  let started = false;
  form.addEventListener('input', () => {
    if (started) return;
    started = true;
    track('lead_form_start', { form_kind: form.dataset.leadForm || '' });
  });
});

type Hours = { days: number[]; open: string | null; close: string | null };
type Override = { date: string; open?: string | null; close?: string | null; note?: string };

function nyNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return {
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}
const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmt = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h >= 12 ? 'PM' : 'AM'}`; };

document.querySelectorAll<HTMLElement>('[data-open-status]').forEach((el) => {
  try {
    const { hours, overrides } = JSON.parse(el.dataset.openStatus!) as { hours: Hours[]; overrides: Override[] };
    const now = nyNow();
    const override = overrides.find((o) => o.date === now.date);
    const today = override ?? hours.find((h) => h.days.includes(now.day));
    let text = '';
    if (today?.open && today.close && now.minutes >= mins(today.open) && now.minutes < mins(today.close)) {
      text = `Showroom open now until ${fmt(today.close)}`;
      el.dataset.state = 'open';
    } else {
      text = override?.note ? `Showroom closed today (${override.note})` : 'Showroom closed right now';
      el.dataset.state = 'closed';
    }
    el.textContent = text;
    el.hidden = false;
  } catch { /* leave the regular hours as they are */ }
});

// ---------- Calm motion (reveals, line-by-line headings, parallax, magnetic buttons) ----------
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const seen = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); seen.unobserve(e.target); }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
document.querySelectorAll('[data-reveal], .lines').forEach((el) => seen.observe(el));

if (!calm) {
  const layers = [...document.querySelectorAll<HTMLElement>('.living[data-motion="parallax"]')];
  if (layers.length) {
    let ticking = false;
    const update = () => {
      ticking = false;
      for (const el of layers) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const progress = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; // -1..1 through the viewport
        el.style.setProperty('--py', `${(-progress * r.height * 0.05).toFixed(1)}px`);
      }
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${((e.clientX - r.left) / r.width - 0.5) * 8}px, ${((e.clientY - r.top) / r.height - 0.5) * 6}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }
}

// Fire engine and calibration tool load only on pages that use them.
if (document.querySelector('[data-living]')) {
  import('./living').then((m) => {
    m.init();
    if (new URLSearchParams(location.search).has('calibrate') && document.documentElement.dataset.env !== 'production') import('./living-calibrate').then((c) => c.start());
  });
}
