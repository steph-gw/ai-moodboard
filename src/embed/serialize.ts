import {
  DEFAULT_LINE_HEIGHT,
  MAX_LINE_HEIGHT,
  MIN_LINE_HEIGHT,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  type CanvasElement,
  type ShapeKind,
  type StrokeStyle,
  type TextFontFamily,
} from '../types';

export interface SlideContent {
  elements: CanvasElement[];
  /** Slide background. Undefined means the default paper color. */
  background?: string;
}

/**
 * Reads a slide's `Elements JSON`. Never throws: a board that fails to parse should render
 * as an empty slide the planner can rebuild, not an error boundary over the whole app.
 *
 * Two shapes are accepted. The original is a bare array of elements; the current one wraps
 * it so the slide can carry properties of its own, starting with a background color.
 * Keeping the old shape readable means the field needs no migration and no second Bubble
 * field — every board written before this still opens.
 */
export function parseSlideContent(json: unknown, knownImageIds: ReadonlySet<string>): SlideContent {
  if (typeof json !== 'string' || !json.trim()) return { elements: [] };

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { elements: [] };
  }

  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { elements?: unknown })?.elements)
      ? ((raw as { elements: unknown[] }).elements)
      : [];
  const background =
    !Array.isArray(raw) && typeof (raw as { background?: unknown })?.background === 'string'
      ? (raw as { background: string }).background
      : undefined;

  return {
    elements: list.flatMap((item) => {
      const el = coerceElement(item, knownImageIds);
      return el ? [el] : [];
    }),
    background,
  };
}

export function serializeSlideContent(content: SlideContent): string {
  return JSON.stringify({
    elements: content.elements,
    ...(content.background ? { background: content.background } : {}),
  });
}

const FONTS: readonly TextFontFamily[] = [
  'sans',
  'display',
  'inter',
  'roboto',
  'openSans',
  'montserrat',
  'poppins',
  'lato',
  'lora',
];
const ALIGNS = ['left', 'center', 'right'] as const;
/** What a caption written before it could choose renders as — the same as new text. */
const DEFAULT_CAPTION_FONT: TextFontFamily = 'display';
const SHAPES: readonly ShapeKind[] = ['line', 'rect', 'ellipse', 'triangle', 'polygon'];
const STROKES: readonly StrokeStyle[] = ['solid', 'dashed', 'dotted'];

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
    // Absent on anything placed before ownership was recorded, and on a template fork.
    ...(typeof o.createdBy === 'string' && o.createdBy ? { createdBy: o.createdBy } : {}),
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
      // Absent on anything written before line height existed; the renderer's default
      // then applies, so old boards keep looking exactly as they did.
      ...(o.lineHeight === undefined
        ? {}
        : { lineHeight: clamp(num(o.lineHeight, DEFAULT_LINE_HEIGHT), MIN_LINE_HEIGHT, MAX_LINE_HEIGHT) }),
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

  if (o.type === 'paletteGroup') {
    const colors = Array.isArray(o.colors)
      ? o.colors.filter((c): c is string => typeof c === 'string')
      : [];
    // A group with nothing in it would render as an invisible box that still selects and
    // drags — worse than being dropped.
    if (colors.length === 0) return null;
    return {
      ...base,
      type: 'paletteGroup',
      colors,
      showHex: o.showHex !== false,
      fontFamily: FONTS.includes(o.fontFamily as TextFontFamily)
        ? (o.fontFamily as TextFontFamily)
        : DEFAULT_CAPTION_FONT,
    };
  }

  if (o.type === 'swatch') {
    return {
      ...base,
      type: 'swatch',
      color: typeof o.color === 'string' ? o.color : '#cccccc',
      fontFamily: FONTS.includes(o.fontFamily as TextFontFamily)
        ? (o.fontFamily as TextFontFamily)
        : DEFAULT_CAPTION_FONT,
      // Absent means shown: swatches written before the caption could be turned off all
      // had one, and a missing flag must not silently strip it from them.
      showHex: o.showHex !== false,
    };
  }

  if (o.type === 'shape') {
    // An unknown shape name would render as nothing at all, which looks like data loss.
    // Falling back to a rectangle keeps the element visible and movable.
    const shape = SHAPES.includes(o.shape as ShapeKind) ? (o.shape as ShapeKind) : 'rect';
    return {
      ...base,
      type: 'shape',
      shape,
      fill: typeof o.fill === 'string' ? o.fill : undefined,
      stroke: typeof o.stroke === 'string' ? o.stroke : '#1a1714',
      strokeWidth: clamp(num(o.strokeWidth, 2), 0, 40),
      strokeStyle: STROKES.includes(o.strokeStyle as StrokeStyle)
        ? (o.strokeStyle as StrokeStyle)
        : 'solid',
      radius: shape === 'rect' ? clamp(num(o.radius, 0), 0, 200) : undefined,
      sides: shape === 'polygon' ? clamp(Math.round(num(o.sides, 5)), 3, 12) : undefined,
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
