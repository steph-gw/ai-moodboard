import { SLIDE_HEIGHT, SLIDE_WIDTH, type CanvasElement, type TextFontFamily } from '../types';

/**
 * Reads a slide's `Elements JSON`. Never throws: a board that fails to parse should render
 * as an empty slide the planner can rebuild, not an error boundary over the whole app.
 */
export function parseElements(json: unknown, knownImageIds: ReadonlySet<string>): CanvasElement[] {
  if (typeof json !== 'string' || !json.trim()) return [];

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item) => {
    const el = coerceElement(item, knownImageIds);
    return el ? [el] : [];
  });
}

export function serializeElements(elements: readonly CanvasElement[]): string {
  return JSON.stringify(elements);
}

const FONTS: readonly TextFontFamily[] = ['sans', 'display'];
const ALIGNS = ['left', 'center', 'right'] as const;

function coerceElement(item: unknown, knownImageIds: ReadonlySet<string>): CanvasElement | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  if (typeof o.id !== 'string') return null;

  // Geometry is clamped rather than trusted. A stored element outside the artboard would be
  // invisible and unselectable, with no way for the user to work out where it went.
  const width = clamp(num(o.width, 200), 1, SLIDE_WIDTH);
  const height = clamp(num(o.height, 150), 1, SLIDE_HEIGHT);
  const base = {
    id: o.id,
    x: clamp(num(o.x, 0), 0, SLIDE_WIDTH - width),
    y: clamp(num(o.y, 0), 0, SLIDE_HEIGHT - height),
    width,
    height,
    rotation: num(o.rotation, 0),
    zIndex: num(o.zIndex, 1),
  };

  if (o.type === 'image') {
    // Drop placements whose image is gone — getImageById would return undefined and the
    // element would render as an empty box the user can't diagnose.
    if (typeof o.imageId !== 'string' || !knownImageIds.has(o.imageId)) return null;
    return { ...base, type: 'image', imageId: o.imageId };
  }

  if (o.type === 'text') {
    return {
      ...base,
      type: 'text',
      content: typeof o.content === 'string' ? o.content : '',
      fontSize: clamp(num(o.fontSize, 28), 8, 200),
      fontFamily: FONTS.includes(o.fontFamily as TextFontFamily)
        ? (o.fontFamily as TextFontFamily)
        : 'sans',
      color: typeof o.color === 'string' ? o.color : '#1a1714',
      align: (ALIGNS as readonly string[]).includes(o.align as string)
        ? (o.align as (typeof ALIGNS)[number])
        : 'left',
      bold: o.bold === true,
      italic: o.italic === true,
    };
  }

  return null;
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
