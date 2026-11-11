// Installed from 21st.dev (@abushaidislam7/grid-testimonials-marquee, MIT) and adapted for this site:
// - rendered as static HTML with no client script: rows pause on hover or keyboard focus through CSS,
//   and a "Pause" switch stops the motion for touch and keyboard users
// - cards show a real, attributed review (name, source, link to the original). Demo data, avatars
//   and brand-word highlighting are removed; an initial stands in for the avatar
// - only the first copy of each review is exposed to screen readers; the loop copies are hidden
// - colours, type and hairlines use the site tokens; motion stops under prefers-reduced-motion
import type { CSSProperties } from 'react';

export interface TestimonialItem { id: string; name: string; source: string; sourceUrl?: string; content: string }
export interface TestimonialsMarqueeProps { firstRow: TestimonialItem[]; secondRow?: TestimonialItem[]; duration?: number; label?: string }

const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

export function TestimonialCard({ item, hidden = false }: { item: TestimonialItem; hidden?: boolean }) {
  return (
    <figure aria-hidden={hidden || undefined} className="flex min-h-[190px] w-[300px] shrink-0 select-none flex-col justify-start border-line border-r bg-white p-5 sm:w-[380px] sm:p-6">
      <figcaption className="mb-3 flex items-center gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-ember-soft font-display font-semibold text-ember-dark text-lg">{item.name.trim().charAt(0).toUpperCase()}</span>
        <span className="flex flex-col overflow-hidden leading-tight">
          <span className="truncate font-bold text-[0.95rem] text-ink">{item.name}</span>
          <span className="mt-0.5 truncate text-[0.82rem] text-ink-3">
            {item.sourceUrl && !hidden ? <a className="underline underline-offset-2" href={item.sourceUrl} rel="noopener" target="_blank">{item.source} review</a> : `${item.source} review`}
          </span>
        </span>
      </figcaption>
      <blockquote className="m-0 whitespace-pre-line text-[0.95rem] text-ink-2 leading-[1.55]">&ldquo;{item.content}&rdquo;</blockquote>
    </figure>
  );
}

function Row({ items, direction }: { items: TestimonialItem[]; direction: 'left' | 'right' }) {
  // Enough copies to fill a wide screen, then the whole set once more for a seamless loop.
  const copies = Math.max(2, Math.ceil(8 / items.length));
  const set = (clone: boolean) => (
    <div aria-hidden={clone || undefined} className="flex flex-nowrap">
      {Array.from({ length: copies }, (_, c) => items.map((item) => <TestimonialCard hidden={clone || c > 0} item={item} key={`${c}-${item.id}`} />))}
    </div>
  );
  return (
    <div className="tmq-row flex w-full overflow-hidden">
      <div className={cn('tmq-track', direction === 'left' ? 'tmq-left' : 'tmq-right')}>{set(false)}{set(true)}</div>
    </div>
  );
}

export default function TestimonialsMarquee({ firstRow, secondRow = [], duration = 80, label = 'Customer reviews' }: TestimonialsMarqueeProps) {
  return (
    <div aria-label={label} className="tmq relative w-full overflow-hidden" role="region" style={{ '--tmq-duration': `${duration}s` } as CSSProperties}>
      <style>{`
        @keyframes tmq-left { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(-50%, 0, 0); } }
        @keyframes tmq-right { from { transform: translate3d(-50%, 0, 0); } to { transform: translate3d(0, 0, 0); } }
        .tmq-track { display: flex; width: max-content; will-change: transform; backface-visibility: hidden; }
        .tmq-left { animation: tmq-left var(--tmq-duration) linear infinite; }
        .tmq-right { animation: tmq-right var(--tmq-duration) linear infinite; }
        .tmq-row:hover .tmq-track, .tmq-row:focus-within .tmq-track, .tmq:has(.tmq-pause:checked) .tmq-track { animation-play-state: paused; }
        .tmq-switch:has(:focus-visible) { outline: 3px solid var(--color-ember); outline-offset: 3px; }
        .tmq:has(.tmq-pause:checked) .tmq-off, .tmq:not(:has(.tmq-pause:checked)) .tmq-on { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .tmq-track { animation: none !important; }
          .tmq-row { overflow-x: auto; }
          .tmq-switch { display: none; }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-10 bg-gradient-to-r from-paper to-transparent sm:w-28" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-10 bg-gradient-to-l from-paper to-transparent sm:w-28" />
      <div className="flex w-full flex-col border-line border-y">
        <Row direction="left" items={firstRow} />
        {secondRow.length > 0 && <div className="border-line border-t"><Row direction="right" items={secondRow} /></div>}
      </div>
      <label className="tmq-switch relative z-30 mx-auto mt-4 flex w-fit cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-4 py-2 font-semibold text-ink-2 text-sm">
        <input className="tmq-pause sr-only" type="checkbox" />
        <span className="tmq-off">Pause the reviews</span>
        <span className="tmq-on">Play the reviews</span>
      </label>
    </div>
  );
}
