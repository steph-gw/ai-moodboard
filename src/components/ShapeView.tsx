import type { ShapeElement } from '../types';

/**
 * Draws a shape as SVG sized to the element's box.
 *
 * SVG rather than CSS borders because a triangle or polygon has no CSS equivalent that
 * also takes an outline, and because the same markup prints — the PDF export renders these
 * through the browser's own print path, where a clip-path trick would come out flat.
 *
 * The viewBox is the element's own pixel box, so stroke widths stay in slide units and
 * scale with the canvas like everything else.
 */
export function ShapeView({ element }: { element: ShapeElement }) {
  const { shape, fill, stroke, strokeWidth, strokeStyle, radius, sides } = element;
  const w = Math.max(element.width, 1);
  const h = Math.max(element.height, 1);

  // Half the stroke sits outside the path, so an un-inset shape is clipped along its edges.
  const inset = strokeWidth / 2;
  const dash =
    strokeStyle === 'dashed'
      ? `${strokeWidth * 3} ${strokeWidth * 2}`
      : strokeStyle === 'dotted'
        ? `0 ${strokeWidth * 2}`
        : undefined;

  const common = {
    stroke,
    strokeWidth,
    strokeDasharray: dash,
    // A dotted line is round caps on a zero-length dash; without this it draws nothing.
    strokeLinecap: (strokeStyle === 'dotted' ? 'round' : 'butt') as 'round' | 'butt',
    fill: shape === 'line' ? 'none' : (fill ?? 'none'),
  };

  return (
    <svg
      className="shape-svg"
      width="100%"
      height="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {shape === 'line' && (
        // Drawn across the middle of the box, so rotating the element aims the line.
        <line x1={inset} y1={h / 2} x2={w - inset} y2={h / 2} {...common} />
      )}
      {shape === 'rect' && (
        <rect
          x={inset}
          y={inset}
          width={Math.max(w - strokeWidth, 0)}
          height={Math.max(h - strokeWidth, 0)}
          rx={radius ?? 0}
          {...common}
        />
      )}
      {shape === 'ellipse' && (
        <ellipse
          cx={w / 2}
          cy={h / 2}
          rx={Math.max(w / 2 - inset, 0)}
          ry={Math.max(h / 2 - inset, 0)}
          {...common}
        />
      )}
      {shape === 'triangle' && (
        <polygon
          points={`${w / 2},${inset} ${w - inset},${h - inset} ${inset},${h - inset}`}
          strokeLinejoin="round"
          {...common}
        />
      )}
      {shape === 'polygon' && (
        <polygon points={polygonPoints(w, h, inset, sides ?? 5)} strokeLinejoin="round" {...common} />
      )}
    </svg>
  );
}

/** Regular polygon inscribed in the box, first vertex at the top. */
function polygonPoints(w: number, h: number, inset: number, sides: number): string {
  const rx = Math.max(w / 2 - inset, 0);
  const ry = Math.max(h / 2 - inset, 0);
  return Array.from({ length: sides }, (_, i) => {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    return `${w / 2 + rx * Math.cos(angle)},${h / 2 + ry * Math.sin(angle)}`;
  }).join(' ');
}
