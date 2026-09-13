import type { SwatchElement } from '../types';

/**
 * How a placed color renders, on the canvas and in the PDF alike.
 *
 * One component for both so they cannot drift: a swatch that printed differently from the
 * screen would be found by a client, in a deck, after approval.
 *
 * Everything scales off the element's own box. Enlarging a swatch has to enlarge its
 * caption too, or an enlarged chip ends up with type that looks like a mistake.
 */
export function SwatchView({ element }: { element: SwatchElement }) {
  const showHex = element.showHex !== false;
  const captionH = showHex ? clamp(element.height * 0.2, 11, 28) : 0;
  const gap = showHex ? clamp(captionH * 0.28, 3, 8) : 0;
  const fontSize = clamp(captionH * 0.58, 6.5, 15);

  return (
    <div className="swatch" style={{ gap }}>
      <div className="swatch-chip" style={{ background: element.color }} />
      {showHex && (
        <span className="swatch-hex" style={{ height: captionH, fontSize, lineHeight: `${captionH}px` }}>
          {element.color.toUpperCase()}
        </span>
      )}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
