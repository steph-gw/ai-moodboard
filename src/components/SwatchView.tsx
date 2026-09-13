import type { CSSProperties } from 'react';
import type { PaletteGroupElement, SwatchElement, TextFontFamily } from '../types';
import { textFontCss } from '../utils/textFonts';

/** Gap between chips in a group, as a share of the chip width. */
const GROUP_GAP = 0.12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Where this chip's grain starts, one offset per noise layer.
 *
 * Derived from the color, so it is stable — a chip does not shimmer into a different weave
 * on every render, and the same color looks the same wherever it is placed — but different
 * between colors, so a palette is not five prints of one texture.
 */
function grainOffsets(color: string): Record<string, string> {
  let h = 0;
  for (let i = 0; i < color.length; i += 1) h = (h * 31 + color.charCodeAt(i)) >>> 0;
  const at = (salt: number, tile: number) => {
    const a = (h >>> salt) % tile;
    const b = (h >>> (salt + 5)) % tile;
    return `${a}px ${b}px`;
  };
  return {
    '--grain-1': at(0, 180),
    '--grain-2': at(7, 110),
    '--grain-3': at(13, 60),
  };
}

/**
 * One color chip with its hex underneath.
 *
 * Everything scales off the box it is given. Enlarging a swatch has to enlarge its caption
 * too, or a pulled-out chip ends up with type that looks like a mistake.
 */
/**
 * The caption's box for a chip of this height.
 *
 * Shared with unlocking, which has to place a real text element exactly where the caption
 * was being drawn — otherwise the palette jumps the moment it is opened.
 */
export function swatchCaption(height: number): {
  captionH: number;
  gap: number;
  fontSize: number;
} {
  const captionH = clamp(height * 0.2, 11, 28);
  return { captionH, gap: clamp(captionH * 0.28, 3, 8), fontSize: clamp(captionH * 0.58, 6.5, 15) };
}

export const DEFAULT_CAPTION_FONT: TextFontFamily = 'display';

export function SwatchChip({
  color,
  width,
  height,
  showHex,
  fontFamily,
}: {
  color: string;
  width: number;
  height: number;
  showHex: boolean;
  fontFamily?: TextFontFamily;
}) {
  const caption = swatchCaption(height);
  const captionH = showHex ? caption.captionH : 0;
  const gap = showHex ? caption.gap : 0;
  const fontSize = caption.fontSize;

  return (
    <div className="swatch" style={{ gap, width, height }}>
      <div
        className="swatch-chip"
        style={{ background: color, ...grainOffsets(color) } as CSSProperties}
      />
      {showHex && (
        <span
          className="swatch-hex"
          style={{
            height: captionH,
            fontSize,
            lineHeight: `${captionH}px`,
            fontFamily: textFontCss(fontFamily ?? DEFAULT_CAPTION_FONT),
          }}
        >
          {color.toUpperCase()}
        </span>
      )}
    </div>
  );
}

/**
 * A single color, placed on its own — what a group becomes when it is unlocked.
 *
 * `scale` is the artboard's, because the element's box is drawn at slide units × scale
 * while everything in here is plain CSS pixels. Without it the chip is laid out at full
 * slide size inside a box that has been shrunk to fit the screen, and the caption hangs
 * out of the bottom — which is what pushed it outside the selection ring.
 */
export function SwatchView({ element, scale = 1 }: { element: SwatchElement; scale?: number }) {
  return (
    <SwatchChip
      color={element.color}
      width={element.width * scale}
      height={element.height * scale}
      showHex={element.showHex !== false}
      fontFamily={element.fontFamily}
    />
  );
}

/**
 * The whole palette in a row, inside one element's box.
 *
 * Laid out here rather than stored as five sets of coordinates: the group has one box, and
 * the chips divide it. That is what keeps them aligned and evenly spaced through a resize
 * without anything having to re-space them.
 */
export function PaletteGroupView({
  element,
  scale = 1,
}: {
  element: PaletteGroupElement;
  /** The artboard's scale — see SwatchView. */
  scale?: number;
}) {
  const cells = paletteGroupCells(element.width * scale, element.colors.length);

  return (
    <div className="palette-group" style={{ gap: cells.gap }}>
      {element.colors.map((color, i) => (
        <SwatchChip
          key={`${color}-${i}`}
          color={color}
          width={cells.width}
          height={element.height * scale}
          showHex={element.showHex !== false}
          fontFamily={element.fontFamily}
        />
      ))}
    </div>
  );
}

/**
 * How a group's box divides into chips.
 *
 * Exported because unlocking has to place the loose swatches exactly where the group was
 * drawing them — the parts must land on top of the picture they replace, or the group
 * appears to jump the moment it is opened.
 */
export function paletteGroupCells(width: number, count: number): { width: number; gap: number } {
  if (count <= 0) return { width, gap: 0 };
  // Solves width = n*cell + (n-1)*gap, with the gap set as a share of the cell so the
  // spacing stays in proportion at any size.
  const cell = width / (count + (count - 1) * GROUP_GAP);
  return { width: cell, gap: cell * GROUP_GAP };
}
