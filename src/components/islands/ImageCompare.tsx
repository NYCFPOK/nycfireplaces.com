// Before/after slider. Drag, tap, or use the arrow keys. Built in-house in the
// site's own style (the 21st.dev registry needs a signed-in account).
import { useRef, useState } from 'react';
interface Props { before: string; after: string; beforeAlt: string; afterAlt: string; beforeLabel?: string; afterLabel?: string; ratio?: string }
export default function ImageCompare({ before, after, beforeAlt, afterAlt, beforeLabel = 'Before', afterLabel = 'After', ratio = '4 / 5' }: Props) {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const move = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <div className="cmp" ref={box} style={{ aspectRatio: ratio }}
      onPointerDown={(e) => { drag.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => drag.current && move(e.clientX)}
      onPointerUp={() => (drag.current = false)} onPointerCancel={() => (drag.current = false)}>
      <img src={after} alt={afterAlt} loading="lazy" decoding="async" draggable={false} />
      <img src={before} alt={beforeAlt} loading="lazy" decoding="async" draggable={false} style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <span className="cmp-tag cmp-l" aria-hidden="true">{beforeLabel}</span>
      <span className="cmp-tag cmp-r" aria-hidden="true">{afterLabel}</span>
      <div className="cmp-line" style={{ left: `${pos}%` }} aria-hidden="true"><i /></div>
      <input className="cmp-range" type="range" min={0} max={100} step={1} value={Math.round(pos)} onChange={(e) => setPos(+e.target.value)} aria-label={`Reveal ${beforeLabel.toLowerCase()} or ${afterLabel.toLowerCase()} photo`} />
    </div>
  );
}
