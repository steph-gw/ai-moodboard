export type UserRole = 'planner' | 'client';

export type SectionStatus = 'approved' | 'open' | 'pending' | 'none';

export type ImageVote = 'up' | 'down';

export interface Viewer {
  id: string;
  initials: string;
  name: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
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
  bold?: boolean;
  italic?: boolean;
}

/** Straight line, or a closed shape drawn to fill its box. */
export type ShapeKind = 'line' | 'rect' | 'ellipse' | 'triangle' | 'polygon';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

export interface ShapeElement extends CanvasElementBase {
  type: 'shape';
  shape: ShapeKind;
  /** Interior colour. Undefined means no fill — a line never has one. */
  fill?: string;
  stroke: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  /** Corner radius, rect only. */
  radius?: number;
  /** Sides, polygon only. */
  sides?: number;
}

export type CanvasElement = ImageElement | TextElement | ShapeElement;

export interface Slide {
  id: string;
  sectionId: string;
  name: string;
  elements: CanvasElement[];
  commentPins: CommentPin[];
  /** Slide background colour. Undefined uses the default paper. */
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
  weddingName: string;
  /** ISO date (YYYY-MM-DD); formatted for display by formatEventDate. */
  weddingDate: string;
  visionBrief: string;
  palette: string[];
  sections: Section[];
  images: BoardImage[];
  suggestions: Suggestion[];
  viewers: Viewer[];
}

export const SLIDE_WIDTH = 960;
export const SLIDE_HEIGHT = 540;
