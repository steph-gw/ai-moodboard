export type UserRole = 'planner' | 'client';

export type SectionStatus = 'approved' | 'open' | 'pending' | 'none';

export type ImageVote = 'up' | 'down';

export interface Viewer {
  id: string;
  initials: string;
  name: string;
  /** Absolute URL. Falls back to initials when absent. */
  photoUrl?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorPhotoUrl?: string;
  text: string;
  timestamp: string;
  resolved?: boolean;
  resolvedBy?: string;
  edited?: boolean;
  replies?: Comment[];
}

export interface CommentPin {
  id: string;
  x: number;
  y: number;
  /** ISO. Numbering runs in this order, so a pin's number never depends on where it sits. */
  createdAt: string;
  comments: Comment[];
}

export interface BoardImage {
  id: string;
  sectionId: string;
  url: string;
  tags: string[];
  clientVote?: ImageVote;
}

export interface CanvasElementBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  /**
   * Bubble user id of whoever placed this, stamped at creation.
   *
   * Only clients are held to it: they may delete what they added and nothing else. Elements
   * that predate the field have none, which reads as "not yours" — the safe way round, since
   * everything already on a board was put there by the planner.
   */
  createdBy?: string;
}

export interface ImageElement extends CanvasElementBase {
  type: 'image';
  imageId: string;
}

export type TextFontFamily =
  | 'sans'
  | 'display'
  | 'inter'
  | 'roboto'
  | 'openSans'
  | 'montserrat'
  | 'poppins'
  | 'lato'
  | 'lora';

export interface TextElement extends CanvasElementBase {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: TextFontFamily;
  color: string;
  align: 'left' | 'center' | 'right';
  /** Multiplier, not px, so it holds when the font size changes. Default DEFAULT_LINE_HEIGHT. */
  lineHeight?: number;
  bold?: boolean;
  italic?: boolean;
}

/** What text renders at when nothing has been chosen. */
export const DEFAULT_LINE_HEIGHT = 1.3;
export const MIN_LINE_HEIGHT = 0.8;
export const MAX_LINE_HEIGHT = 3;

/** Straight line, or a closed shape drawn to fill its box. */
export type ShapeKind = 'line' | 'rect' | 'ellipse' | 'triangle' | 'polygon';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

export interface ShapeElement extends CanvasElementBase {
  type: 'shape';
  shape: ShapeKind;
  /** Interior color. Undefined means no fill — a line never has one. */
  fill?: string;
  stroke: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  /** Corner radius, rect only. */
  radius?: number;
  /** Sides, polygon only. */
  sides?: number;
}

/**
 * One color from a palette, placed on the board.
 *
 * Its own type rather than a shape with a text box beside it: the caption has to stay
 * attached through a drag and grow with the box through a resize, and two loose elements
 * that merely start next to each other do neither.
 *
 * The color is a copy, not a reference to the palette. Editing a palette later must not
 * repaint swatches on a board someone has already approved.
 */
export interface SwatchElement extends CanvasElementBase {
  type: 'swatch';
  color: string;
  /** The hex caption under the box. Absent reads as shown. */
  showHex?: boolean;
}

export type CanvasElement = ImageElement | TextElement | ShapeElement | SwatchElement;

/** A named set of colors belonging to one moodboard. */
export interface Palette {
  id: string;
  name: string;
  colors: string[];
  order: number;
}

export interface Slide {
  id: string;
  sectionId: string;
  name: string;
  elements: CanvasElement[];
  commentPins: CommentPin[];
  /** Slide background color. Undefined uses the default paper. */
  background?: string;
}

export interface Section {
  id: string;
  name: string;
  icon: string;
  /** Per-section brief; falls back to the board brief when unset. */
  visionBrief?: string;
  status: SectionStatus;
  threadCount?: number;
  approvedDate?: string;
  imageCount: number;
  slides: Slide[];
}

export interface Suggestion {
  id: string;
  url: string;
  alt: string;
}

export interface Board {
  /**
   * A template rather than an event's board: no Event, reusable, and the source future
   * copies are made from. Only changes what the board says about itself — a template is
   * edited exactly like any other board.
   */
  isTemplate?: boolean;
  weddingName: string;
  /** ISO date (YYYY-MM-DD); formatted for display by formatEventDate. */
  weddingDate: string;
  visionBrief: string;
  /**
   * The original single unnamed palette, still read off the Moodboard so the colors a
   * planner already picked are not lost — it seeds the first named palette rather than
   * being shown anywhere. See palettes.
   */
  palette: string[];
  /** Named palettes, the ones the toolbar offers. */
  palettes: Palette[];
  sections: Section[];
  images: BoardImage[];
  suggestions: Suggestion[];
  viewers: Viewer[];
}

export const SLIDE_WIDTH = 960;
export const SLIDE_HEIGHT = 540;

/**
 * Shown when a moodboard has no palette of its own, so the strip is never an empty
 * shrug. Read off gatherwise.io: page ground, ink, the gold accent, and the three
 * neutrals between them.
 */
export const DEFAULT_PALETTE = [
  '#F6EFE0',
  '#EDE5D8',
  '#DED6C8',
  '#B8935F',
  '#6B645A',
  '#2A2723',
];
