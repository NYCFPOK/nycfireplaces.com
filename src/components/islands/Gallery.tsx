// Tap-to-expand gallery with swipe. Thumbnails are plain links to the full
// image, so it still works before (or without) JavaScript.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
export interface GalleryImage { thumb: string; full: string; alt: string; w: number; h: number }
export default function Gallery({ images, layout = 'grid' }: { images: GalleryImage[]; layout?: 'grid' | 'stack' }) {
  const [open, setOpen] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const startX = useRef(0);
  const opener = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + images.length) % images.length)), [images.length]);
  const close = useCallback(() => { setOpen(null); opener.current?.focus(); }, []);
  useEffect(() => {
    if (open === null) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
    document.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = ''; };
  }, [open !== null]);
  return (
    <>
      <ul className={`gal gal-${layout}`}>
        {images.map((img, i) => (
          <li key={img.full}>
            <a href={img.full} onClick={(e) => { e.preventDefault(); opener.current = e.currentTarget; setOpen(i); }} aria-label={`Open photo ${i + 1} of ${images.length}: ${img.alt}`}>
              <img src={img.thumb} alt={img.alt} width={img.w} height={img.h} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
            </a>
          </li>
        ))}
      </ul>
      <AnimatePresence>
        {open !== null && (
          <motion.div className="gal-box" role="dialog" aria-modal="true" aria-label="Photo viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.35 }}
            onClick={(e) => e.target === e.currentTarget && close()}
            onPointerDown={(e) => (startX.current = e.clientX)}
            onPointerUp={(e) => { const dx = e.clientX - startX.current; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); }}>
            <motion.img key={open} src={images[open].full} alt={images[open].alt} draggable={false} initial={reduce ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
            <button ref={closeBtn} className="gal-btn gal-close" onClick={close} aria-label="Close photo viewer">×</button>
            {images.length > 1 && (<>
              <button className="gal-btn gal-prev" onClick={() => step(-1)} aria-label="Previous photo">‹</button>
              <button className="gal-btn gal-next" onClick={() => step(1)} aria-label="Next photo">›</button>
              <p className="gal-count" aria-live="polite">{open + 1} / {images.length}</p>
            </>)}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
