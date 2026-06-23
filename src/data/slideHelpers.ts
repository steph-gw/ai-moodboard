import type { BoardImage, CanvasElement, CommentPin, ImageElement, Slide, TextElement } from '../types';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../types';

const COLLAGE_POSITIONS: Array<{ x: number; y: number; width: number; height: number }> = [
  { x: 20, y: 20, width: 450, height: 250 },
  { x: 490, y: 20, width: 450, height: 250 },
  { x: 20, y: 290, width: 450, height: 230 },
  { x: 490, y: 290, width: 450, height: 230 },
];

function imageElement(
  imageId: string,
  position: { x: number; y: number; width: number; height: number },
  zIndex: number
): ImageElement {
  return {
    id: `el-${imageId}`,
    type: 'image',
    imageId,
    zIndex,
    ...position,
  };
}

function textElement(
  id: string,
  content: string,
  x: number,
  y: number,
  width: number,
  height: number,
  zIndex: number
): TextElement {
  return {
    id,
    type: 'text',
    content,
    x,
    y,
    width,
    height,
    zIndex,
    fontSize: 28,
    fontFamily: 'serif',
    color: '#1a1714',
    align: 'center',
    bold: false,
    italic: false,
  };
}

export function buildSlidesForSection(
  sectionId: string,
  sectionName: string,
  images: BoardImage[]
): Slide[] {
  const sectionImages = images.filter((img) => img.sectionId === sectionId);

  if (sectionImages.length === 0) {
    return [
      {
        id: `slide-${sectionId}-1`,
        sectionId,
        name: 'Slide 1',
        elements: [
          textElement(
            `el-text-${sectionId}-1`,
            `${sectionName} mood`,
            180,
            220,
            600,
            100,
            1
          ),
        ],
        commentPins: [],
      },
    ];
  }

  const slides: Slide[] = [];
  const perSlide = 4;

  for (let i = 0; i < sectionImages.length; i += perSlide) {
    const chunk = sectionImages.slice(i, i + perSlide);
    const slideIndex = Math.floor(i / perSlide) + 1;
    const elements: CanvasElement[] = chunk.map((img, idx) =>
      imageElement(img.id, COLLAGE_POSITIONS[idx], idx + 1)
    );

    slides.push({
      id: `slide-${sectionId}-${slideIndex}`,
      sectionId,
      name: `Slide ${slideIndex}`,
      elements,
      commentPins: slideIndex === 1 && sectionId === 'ceremony' ? ceremonySamplePins() : [],
    });
  }

  slides.push({
    id: `slide-${sectionId}-${slides.length + 1}`,
    sectionId,
    name: `Slide ${slides.length + 1}`,
    elements: [
      textElement(
        `el-text-${sectionId}-mood`,
        `${sectionName} mood`,
        SLIDE_WIDTH / 2 - 300,
        SLIDE_HEIGHT / 2 - 50,
        600,
        100,
        1
      ),
    ],
    commentPins: [],
  });

  return slides;
}

function ceremonySamplePins(): CommentPin[] {
  return [
    {
      id: 'pin-c1',
      x: 180,
      y: 120,
      comments: [
        {
          id: 'c1',
          authorId: '2',
          authorName: 'Anna Linden',
          authorInitials: 'AL',
          text: 'Love this arch style — can we do something similar with more trailing greenery?',
          timestamp: '2 days ago',
          replies: [
            {
              id: 'c1r1',
              authorId: '1',
              authorName: 'Sophie Clarke',
              authorInitials: 'SC',
              text: "Absolutely — I'll source some options with fuller cascading florals.",
              timestamp: '1 day ago',
            },
          ],
        },
      ],
    },
    {
      id: 'pin-c2',
      x: 520,
      y: 340,
      comments: [
        {
          id: 'c2',
          authorId: '1',
          authorName: 'Sophie Clarke',
          authorInitials: 'SC',
          text: 'The stone backdrop here matches Rosewood Estate perfectly.',
          timestamp: '3 days ago',
          resolved: true,
          resolvedBy: 'Sophie Clarke',
        },
      ],
    },
    {
      id: 'pin-c3',
      x: 720,
      y: 180,
      comments: [
        {
          id: 'c3',
          authorId: '2',
          authorName: 'Anna Linden',
          authorInitials: 'AL',
          text: 'These cross-back chairs are exactly what I had in mind.',
          timestamp: '4 days ago',
        },
      ],
    },
  ];
}

export function defaultTextElement(): TextElement {
  return {
    id: `el-text-${Date.now()}`,
    type: 'text',
    content: 'Heading',
    x: SLIDE_WIDTH / 2 - 150,
    y: SLIDE_HEIGHT / 2 - 30,
    width: 300,
    height: 60,
    zIndex: 10,
    fontSize: 28,
    fontFamily: 'serif',
    color: '#1a1714',
    align: 'center',
    bold: false,
    italic: false,
  };
}

export function defaultImageElement(imageId: string, zIndex: number): ImageElement {
  return {
    id: `el-${imageId}`,
    type: 'image',
    imageId,
    x: 80,
    y: 60,
    width: 400,
    height: 300,
    zIndex,
  };
}
