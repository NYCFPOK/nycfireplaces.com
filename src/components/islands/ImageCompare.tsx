// Before/after slider. Drag, tap, or use the arrow keys. The slider is the
// Dice UI Compare Slider from 21st.dev, re-skinned (see ../ui/compare-slider.tsx).
import { CompareSlider, CompareSliderAfter, CompareSliderBefore, CompareSliderHandle, CompareSliderLabel } from '../ui/compare-slider';
interface Props { before: string; after: string; beforeAlt: string; afterAlt: string; beforeLabel?: string; afterLabel?: string; ratio?: string }
const IMG = 'pointer-events-none absolute inset-0 h-full w-full object-cover';
export default function ImageCompare({ before, after, beforeAlt, afterAlt, beforeLabel = 'Before', afterLabel = 'After', ratio = '4 / 5' }: Props) {
  // In this component the "After" layer is the one revealed from the left edge,
  // so it holds our earlier photo; the "Before" layer shows to the right of the divider.
  return (
    <CompareSlider className="rounded-[var(--radius-card)] bg-paper-3" style={{ aspectRatio: ratio }} aria-label={`Compare the ${beforeLabel.toLowerCase()} and ${afterLabel.toLowerCase()} photos`}>
      <CompareSliderBefore role="presentation" aria-hidden={undefined}>
        <img className={IMG} src={after} alt={afterAlt} loading="lazy" decoding="async" draggable={false} />
        <CompareSliderLabel side="after" aria-hidden="true">{afterLabel}</CompareSliderLabel>
      </CompareSliderBefore>
      <CompareSliderAfter role="presentation" aria-hidden={undefined}>
        <img className={IMG} src={before} alt={beforeAlt} loading="lazy" decoding="async" draggable={false} />
        <CompareSliderLabel side="before" aria-hidden="true">{beforeLabel}</CompareSliderLabel>
      </CompareSliderAfter>
      <CompareSliderHandle />
    </CompareSlider>
  );
}
