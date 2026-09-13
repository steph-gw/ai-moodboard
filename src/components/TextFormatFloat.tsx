import { useLayoutEffect, useRef, useState } from 'react';
import type { TextElement } from '../types';
import { TextFormatControls } from './TextFormatBar';

/**
 * Text formatting, floating on the slide's top edge.
 *
 * It used to live in the canvas bar above the artboard, sharing a row with the brief, the
 * status and the toolbar — which meant selecting a text box crowded every other control in
 * that row. Out here it has the width it needs and takes none from anything else.
 *
 * Positioned as an overlay rather than in the layout, for the same reason the element
 * toolbar is: anything that occupies height above the artboard changes the height the
 * artboard is scaled to fit, so the slide would resize under the cursor every time a text
 * box was selected.
 */
export function TextFormatFloat({
  element,
  slideId,
  applyToIds,
  count,
}: {
  element: TextElement;
  slideId: string;
  applyToIds: string[];
  count: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);

  // Measured from the artboard rather than the stage: the artboard is centred inside a
  // stage that is usually taller and wider than it is, so the stage's own top edge is not
  // the slide's.
  useLayoutEffect(() => {
    const place = () => {
      const bar = ref.current;
      const stage = bar?.parentElement;
      const artboard = stage?.querySelector('.slide-artboard');
      if (!bar || !stage || !artboard) return;
      const s = stage.getBoundingClientRect();
      const a = artboard.getBoundingClientRect();
      const w = bar.offsetWidth;
      const h = bar.offsetHeight;
      setAt({
        // Centred on the slide, and kept inside the stage on narrow windows so the ends
        // of the bar never fall off the side.
        left: Math.max(4, Math.min(s.width - w - 4, a.left - s.left + (a.width - w) / 2)),
        // Inside the stage, never above it. Reaching over the top edge put the bar under
        // the toolbar row — which paints over it, so it read as translucent and broken.
        // Clamped here it sits directly below that row on every window size, overlapping
        // the top of the slide rather than the controls above it.
        top: Math.max(2, a.top - s.top - h * 0.62),
      });
    };
    place();
    const ro = new ResizeObserver(place);
    if (ref.current?.parentElement) ro.observe(ref.current.parentElement);
    window.addEventListener('resize', place);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [element.id, count]);

  return (
    <div
      ref={ref}
      className="text-format-float"
      style={at ? { left: at.left, top: at.top } : { opacity: 0 }}
    >
      {count > 1 && <span className="toolbar-count">{count} selected</span>}
      <TextFormatControls element={element} slideId={slideId} applyToIds={applyToIds} />
    </div>
  );
}
