// Tap-to-expand gallery with swipe. The viewer is the Kokonut UI Lightbox Grid
// from 21st.dev, re-skinned (see ../ui/lightbox-grid.tsx). Thumbnails are plain
// links to the full image, so it still works before (or without) JavaScript.
import LightboxGrid from '../ui/lightbox-grid';
export interface GalleryImage { thumb: string; full: string; alt: string; w: number; h: number; fw: number; fh: number }
export default function Gallery({ images, layout = 'grid' }: { images: GalleryImage[]; layout?: 'grid' | 'stack' }) {
  return <LightboxGrid layout={layout} images={images.map((i) => ({ src: i.full, thumb: i.thumb, thumbWidth: i.w, thumbHeight: i.h, alt: i.alt, width: i.fw, height: i.fh }))} />;
}
