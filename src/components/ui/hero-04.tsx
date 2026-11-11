// Installed from 21st.dev (@felipemenezes098/hero-04, "Editorial Collage Hero") and adapted for this site:
// - rendered as static HTML (no client script): the optional entrance animation, motion,
//   react-wrap-balancer and the shadcn button are removed; headings balance with CSS
// - responsive image sources (srcset) so the main photo stays fast as the largest paint
// - breadcrumbs, eyebrow and our own tracked call/help buttons are passed in as children
// - colours, type, radius and shadows use the site tokens
import type { ReactNode } from 'react';

export interface HeroImage { src: string; srcSet?: string; sizes?: string; width: number; height: number; alt: string }
export interface Hero04Props {
  title: string;
  description: string;
  primaryImage: HeroImage;
  secondaryImage: HeroImage;
  /** Rendered above the title (breadcrumbs, eyebrow). */
  before?: ReactNode;
  /** Rendered below the description (buttons, notes). */
  children?: ReactNode;
}

export function ArtCollage({ primaryImage, secondaryImage }: Readonly<Pick<Hero04Props, 'primaryImage' | 'secondaryImage'>>) {
  return (
    <div className="relative mx-auto w-full max-w-md sm:max-w-lg">
      <div aria-hidden="true" className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-flame/15 opacity-60 blur-3xl" />
      <div className="relative aspect-square w-[82%] sm:aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] shadow-xl outline outline-black/10">
        <img {...primaryImage} decoding="async" fetchPriority="high" loading="eager" className="size-full object-cover" />
      </div>
      <div className="absolute -right-1 bottom-6 aspect-square w-[42%] rotate-3 overflow-hidden rounded-xl shadow-lg outline outline-black/10 sm:-right-4">
        <img {...secondaryImage} decoding="async" loading="eager" className="size-full object-cover" />
      </div>
    </div>
  );
}

export default function Hero04({ title, description, primaryImage, secondaryImage, before, children }: Readonly<Hero04Props>) {
  return (
    <section className="hero-collage relative isolate w-full overflow-hidden border-line border-b bg-paper-2">
      <div className="wrap relative z-10 grid grid-cols-1 items-center gap-10 py-[clamp(2rem,5vw,4.5rem)] min-[900px]:grid-cols-[1.1fr_0.9fr] min-[900px]:gap-16">
        <div className="flex flex-col items-start">
          {before}
          <h1 className="mb-4 max-w-[20ch]">{title}</h1>
          <p className="lede">{description}</p>
          {children}
        </div>
        <div className="w-full pr-2 sm:pr-4">
          <ArtCollage primaryImage={primaryImage} secondaryImage={secondaryImage} />
        </div>
      </div>
    </section>
  );
}
