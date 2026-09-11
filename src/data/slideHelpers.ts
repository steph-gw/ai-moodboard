import type {
  BoardImage,
  CanvasElement,
  CommentPin,
  ImageElement,
  ShapeElement,
  ShapeKind,
  Slide,
  TextElement,
  TextFontFamily,
} from '../types';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../types';

function imageElement(
  id: string,
  imageId: string,
  position: { x: number; y: number; width: number; height: number },
  zIndex: number
): ImageElement {
  return {
    id,
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
  zIndex: number,
  options: {
    fontSize?: number;
    fontFamily?: TextFontFamily;
    color?: string;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    italic?: boolean;
  } = {}
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
    fontSize: options.fontSize ?? 28,
    fontFamily: options.fontFamily ?? 'sans',
    color: options.color ?? '#1a1714',
    align: options.align ?? 'center',
    bold: options.bold ?? false,
    italic: options.italic ?? false,
  };
}

function indexById(images: BoardImage[]) {
  const byId = Object.fromEntries(images.map((img) => [img.id, img]));
  return (id: string) => byId[id];
}

function pushImage(
  elements: CanvasElement[],
  img: ReturnType<typeof indexById>,
  elId: string,
  imageId: string,
  position: { x: number; y: number; width: number; height: number },
  zIndex: number
) {
  if (img(imageId)) {
    elements.push(imageElement(elId, imageId, position, zIndex));
  }
}


/** A named color in the palette slide, with the swatch's own label color. */
interface Swatch {
  name: string;
  hex: string;
  /** Dark swatches need light type over them. */
  onDark?: boolean;
}

const CEREMONY_PALETTE: Swatch[] = [
  { name: 'Shell Cream', hex: '#F5EDE8' },
  { name: 'Warm Sand', hex: '#F6EAD4' },
  { name: 'Sage Leaf', hex: '#8A9A7B', onDark: true },
  { name: 'Blush Petal', hex: '#D4B5A0' },
  { name: 'Antique Gold', hex: '#C4A35A' },
  { name: 'Weathered Stone', hex: '#9B9186' },
  { name: 'Deep Bark', hex: '#5C4A3A', onDark: true },
  { name: 'Pearl White', hex: '#FAFAF8' },
];

/**
 * The palette board: eight named swatches over two rows, with a direction note.
 *
 * Built out of the same shape and text elements a planner has, rather than a special slide
 * type — it is a worked example of the tools, and it can be picked apart and rearranged
 * like anything else on the canvas.
 */
function buildPaletteSlide(): Slide {
  const elements: CanvasElement[] = [];
  let z = 1;

  // Header band
  elements.push(
    shapeElement('el-pal-band', 'rect', 0, 0, SLIDE_WIDTH, 78, z++, {
      fill: '#5C4A3A',
      stroke: '#5C4A3A',
      strokeWidth: 0,
    }),
    textElement('el-pal-title', 'COLOR PALETTE', 40, 22, 460, 40, z++, {
      fontSize: 26,
      fontFamily: 'display',
      color: '#FAFAF8',
      align: 'left',
    }),
    textElement('el-pal-kicker', 'Ivory · Sage · Sand · Gold', 560, 32, 360, 24, z++, {
      fontSize: 13,
      fontFamily: 'sans',
      color: '#E8DCCB',
      align: 'right',
      italic: true,
    })
  );

  // Two rows of four
  // Sized so two rows plus the note card land inside the 540px slide with margin to
  // spare — anything taller gets clamped on load and the text bunches up.
  const COLS = 4;
  const CARD_W = 208;
  const CARD_H = 128;
  const GAP_X = 24;
  const GAP_Y = 20;
  const LEFT = (SLIDE_WIDTH - (COLS * CARD_W + (COLS - 1) * GAP_X)) / 2;
  const TOP = 100;

  CEREMONY_PALETTE.forEach((swatch, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = LEFT + col * (CARD_W + GAP_X);
    const y = TOP + row * (CARD_H + GAP_Y);
    const ink = swatch.onDark ? '#FAFAF8' : '#5C4A3A';

    elements.push(
      shapeElement(`el-pal-sw-${i}`, 'rect', x, y, CARD_W, CARD_H, z++, {
        fill: swatch.hex,
        stroke: '#DED7CC',
        strokeWidth: 1,
        radius: 2,
      }),
      textElement(`el-pal-name-${i}`, swatch.name, x, y + CARD_H - 50, CARD_W, 22, z++, {
        fontSize: 14,
        fontFamily: 'display',
        color: ink,
        align: 'center',
        italic: true,
      }),
      textElement(`el-pal-hex-${i}`, swatch.hex, x, y + CARD_H - 28, CARD_W, 18, z++, {
        fontSize: 10,
        fontFamily: 'sans',
        color: ink,
        align: 'center',
      })
    );
  });

  const noteY = TOP + 2 * (CARD_H + GAP_Y) + 10;
  elements.push(
    shapeElement('el-pal-note-card', 'rect', LEFT, noteY, SLIDE_WIDTH - LEFT * 2, 88, z++, {
      fill: '#FFFFFF',
      stroke: '#E4DCD0',
      strokeWidth: 1,
      radius: 3,
    }),
    textElement('el-pal-note-title', 'PALETTE DIRECTION', LEFT + 18, noteY + 8, 400, 18, z++, {
      fontSize: 11,
      fontFamily: 'sans',
      color: '#C4A35A',
      align: 'left',
      bold: true,
    }),
    textElement(
      'el-pal-note-body',
      'Primary: shell cream and warm sand carry the linens and paper.\nAccents: sage and antique gold for foliage, candles and hardware.\nGrounding: weathered stone and deep bark tie the garden to the aisle.',
      LEFT + 18,
      noteY + 30,
      SLIDE_WIDTH - LEFT * 2 - 36,
      54,
      z++,
      { fontSize: 12, fontFamily: 'sans', color: '#5C4A3A', align: 'left' }
    )
  );

  return {
    id: 'slide-ceremony-palette',
    sectionId: 'ceremony',
    name: 'Color palette',
    elements,
    commentPins: [],
    background: '#F8F3EF',
  };
}

function shapeElement(
  id: string,
  shape: ShapeKind,
  x: number,
  y: number,
  width: number,
  height: number,
  zIndex: number,
  options: { fill?: string; stroke?: string; strokeWidth?: number; radius?: number } = {}
): ShapeElement {
  return {
    id,
    type: 'shape',
    shape,
    x,
    y,
    width,
    height,
    zIndex,
    fill: options.fill,
    stroke: options.stroke ?? '#1a1714',
    strokeWidth: options.strokeWidth ?? 1,
    strokeStyle: 'solid',
    ...(shape === 'rect' ? { radius: options.radius ?? 0 } : {}),
  };
}

function buildCeremonySlides(images: BoardImage[]): Slide[] {
  const img = indexById(images);
  const moodElements: CanvasElement[] = [];

  pushImage(moodElements, img, 'el-ceremony-mood-1', 'img-1', { x: 28, y: 28, width: 410, height: 360 }, 1);
  pushImage(moodElements, img, 'el-ceremony-mood-2', 'img-2', { x: 458, y: 28, width: 250, height: 188 }, 2);

  moodElements.push(
    textElement('el-text-ceremony-title', 'Ceremony', 728, 36, 208, 48, 10, {
      fontSize: 34,
      fontFamily: 'display',
      align: 'left',
    }),
    textElement(
      'el-text-ceremony-sub',
      'Garden light · open air\nSoft ivory against stone',
      728,
      90,
      208,
      72,
      11,
      { fontSize: 13, fontFamily: 'sans', color: '#6b6460', align: 'left' }
    )
  );

  pushImage(moodElements, img, 'el-ceremony-mood-4', 'img-4', { x: 728, y: 178, width: 208, height: 210 }, 3);
  pushImage(moodElements, img, 'el-ceremony-mood-3', 'img-3', { x: 458, y: 236, width: 250, height: 210 }, 4);

  moodElements.push(
    textElement(
      'el-text-ceremony-caption',
      'Weathered stone · trailing greens · warm ivory',
      28,
      408,
      410,
      56,
      12,
      { fontSize: 15, fontFamily: 'sans', color: '#5c4a3a', align: 'left', italic: true }
    ),
    textElement(
      'el-text-ceremony-note',
      'Keep the aisle quiet — linen, wood, and light.',
      458,
      462,
      478,
      40,
      13,
      { fontSize: 12, fontFamily: 'sans', color: '#a89f96', align: 'left' }
    )
  );

  const guestElements: CanvasElement[] = [
    textElement('el-text-ceremony-dir-title', 'Guest experience', 40, 36, 440, 48, 1, {
      fontSize: 32,
      fontFamily: 'display',
      align: 'left',
    }),
    textElement(
      'el-text-ceremony-dir-body',
      'Arrive under trees, find a quiet seat, and look toward something soft and living — not a stage.',
      40,
      96,
      440,
      90,
      2,
      { fontSize: 15, fontFamily: 'sans', color: '#6b6460', align: 'left', italic: true }
    ),
    textElement(
      'el-text-ceremony-dir-list',
      'Do\n• Handwritten welcome sign\n• Petals only at the aisle start\n• Unplugged ceremony note\n\nAvoid\n• Heavy draping or fabric walls\n• Loud processional music',
      40,
      200,
      440,
      220,
      3,
      { fontSize: 14, fontFamily: 'sans', color: '#1a1714', align: 'left' }
    ),
  ];

  pushImage(guestElements, img, 'el-ceremony-dir-14', 'img-14', { x: 520, y: 36, width: 400, height: 250 }, 4);
  pushImage(guestElements, img, 'el-ceremony-dir-15', 'img-15', { x: 520, y: 306, width: 190, height: 160 }, 5);
  pushImage(guestElements, img, 'el-ceremony-dir-16', 'img-16', { x: 730, y: 306, width: 190, height: 160 }, 6);

  guestElements.push(
    textElement('el-text-ceremony-dir-footer', 'Tone: quiet joy · no spectacle', 40, 460, 440, 40, 7, {
      fontSize: 13,
      fontFamily: 'sans',
      color: '#c4a35a',
      align: 'left',
      bold: true,
    })
  );

  return [
    // Palette first: it is the decision the rest of the section is judged against.
    buildPaletteSlide(),
    { id: 'slide-ceremony-1', sectionId: 'ceremony', name: 'Mood', elements: moodElements, commentPins: ceremonySamplePins() },
    { id: 'slide-ceremony-2', sectionId: 'ceremony', name: 'Guests', elements: guestElements, commentPins: [] },
  ];
}

function buildReceptionSlides(images: BoardImage[]): Slide[] {
  const img = indexById(images);
  const tablesElements: CanvasElement[] = [];

  pushImage(tablesElements, img, 'el-rec-mood-5', 'img-5', { x: 28, y: 28, width: 460, height: 300 }, 1);
  pushImage(tablesElements, img, 'el-rec-mood-6', 'img-6', { x: 508, y: 28, width: 220, height: 170 }, 2);
  pushImage(tablesElements, img, 'el-rec-mood-8', 'img-8', { x: 748, y: 28, width: 184, height: 170 }, 3);

  tablesElements.push(
    textElement('el-text-rec-title', 'Reception', 508, 220, 424, 44, 10, {
      fontSize: 34,
      fontFamily: 'display',
      align: 'left',
    }),
    textElement(
      'el-text-rec-sub',
      'Long tables, low florals, candlelight\nthat feels found — not forced.',
      508,
      272,
      424,
      70,
      11,
      { fontSize: 14, fontFamily: 'sans', color: '#6b6460', align: 'left', italic: true }
    ),
    textElement(
      'el-text-rec-caption',
      'Ivory linen · warm wood · glass that catches the evening',
      28,
      350,
      460,
      48,
      12,
      { fontSize: 14, fontFamily: 'sans', color: '#5c4a3a', align: 'left', italic: true }
    ),
    textElement(
      'el-text-rec-note',
      'Family-style service. No towering centerpieces. Room to lean in.',
      508,
      360,
      424,
      48,
      13,
      { fontSize: 13, fontFamily: 'sans', color: '#a89f96', align: 'left' }
    ),
    textElement(
      'el-text-rec-footer',
      'Palette: cream · sage · amber glow',
      28,
      460,
      900,
      40,
      14,
      { fontSize: 13, fontFamily: 'sans', color: '#c4a35a', align: 'left', bold: true }
    )
  );

  const eveningElements: CanvasElement[] = [
    textElement('el-text-rec-eve-title', 'After dark', 40, 36, 400, 48, 1, {
      fontSize: 32,
      fontFamily: 'display',
      align: 'left',
    }),
    textElement(
      'el-text-rec-eve-body',
      'When the sky softens, the room should feel warmer — not louder. Soft string lights, a clear dance pocket, and space for toasts.',
      40,
      100,
      400,
      110,
      2,
      { fontSize: 15, fontFamily: 'sans', color: '#6b6460', align: 'left', italic: true }
    ),
    textElement(
      'el-text-rec-eve-list',
      'Flow\n• Golden-hour portraits wrap\n• Dinner under the tent\n• First dance near the head table\n• Cake + dancing, not a hard cut',
      40,
      230,
      400,
      180,
      3,
      { fontSize: 14, fontFamily: 'sans', color: '#1a1714', align: 'left' }
    ),
  ];

  pushImage(eveningElements, img, 'el-rec-eve-7', 'img-7', { x: 480, y: 36, width: 440, height: 260 }, 4);
  pushImage(eveningElements, img, 'el-rec-eve-17', 'img-17', { x: 480, y: 316, width: 440, height: 160 }, 5);

  eveningElements.push(
    textElement('el-text-rec-eve-footer', 'Mood: candlelit · unhurried · full of people', 40, 460, 400, 40, 6, {
      fontSize: 13,
      fontFamily: 'sans',
      color: '#c4a35a',
      align: 'left',
      bold: true,
    })
  );

  return [
    { id: 'slide-reception-1', sectionId: 'reception', name: 'Tables', elements: tablesElements, commentPins: [] },
    { id: 'slide-reception-2', sectionId: 'reception', name: 'Evening', elements: eveningElements, commentPins: [] },
  ];
}

function buildFloralsSlides(images: BoardImage[]): Slide[] {
  const img = indexById(images);
  const bouquetElements: CanvasElement[] = [];

  pushImage(bouquetElements, img, 'el-flo-mood-9', 'img-9', { x: 28, y: 28, width: 340, height: 380 }, 1);
  pushImage(bouquetElements, img, 'el-flo-mood-10', 'img-10', { x: 388, y: 28, width: 280, height: 210 }, 2);
  pushImage(bouquetElements, img, 'el-flo-mood-11', 'img-11', { x: 688, y: 28, width: 244, height: 210 }, 3);

  bouquetElements.push(
    textElement('el-text-flo-title', 'Florals', 388, 260, 280, 44, 10, {
      fontSize: 34,
      fontFamily: 'display',
      align: 'left',
    }),
    textElement(
      'el-text-flo-sub',
      'Garden roses, eucalyptus,\nloose and a little wild.',
      388,
      312,
      280,
      70,
      11,
      { fontSize: 14, fontFamily: 'sans', color: '#6b6460', align: 'left', italic: true }
    ),
    textElement(
      'el-text-flo-note',
      'Low arrangements for conversation.\nTrailing greens on the arch only.',
      688,
      260,
      244,
      100,
      12,
      { fontSize: 13, fontFamily: 'sans', color: '#5c4a3a', align: 'left' }
    ),
    textElement(
      'el-text-flo-caption',
      'Blush · cream · sage · a touch of berry',
      28,
      430,
      900,
      50,
      13,
      { fontSize: 14, fontFamily: 'sans', color: '#c4a35a', align: 'left', italic: true }
    )
  );

  const paletteElements: CanvasElement[] = [
    textElement('el-text-flo-pal-title', 'Floral notes', 40, 36, 420, 48, 1, {
      fontSize: 32,
      fontFamily: 'display',
      align: 'left',
    }),
    textElement(
      'el-text-flo-pal-body',
      'Think gathered from the garden, not flown in for drama. Soft shapes, mixed textures, nothing too polished.',
      40,
      100,
      420,
      100,
      2,
      { fontSize: 15, fontFamily: 'sans', color: '#6b6460', align: 'left', italic: true }
    ),
    textElement(
      'el-text-flo-pal-list',
      'Include\n• Garden roses & spray roses\n• Eucalyptus + olive\n• One unexpected bloom\n\nSkip\n• Neon fillers\n• Rigid sphere centerpieces',
      40,
      220,
      420,
      220,
      3,
      { fontSize: 14, fontFamily: 'sans', color: '#1a1714', align: 'left' }
    ),
  ];

  pushImage(paletteElements, img, 'el-flo-pal-19', 'img-19', { x: 500, y: 36, width: 420, height: 250 }, 4);
  pushImage(paletteElements, img, 'el-flo-pal-20', 'img-20', { x: 500, y: 306, width: 420, height: 170 }, 5);

  paletteElements.push(
    textElement('el-text-flo-pal-footer', 'Hero flower: ivory garden rose', 40, 460, 420, 40, 6, {
      fontSize: 13,
      fontFamily: 'sans',
      color: '#c4a35a',
      align: 'left',
      bold: true,
    })
  );

  return [
    { id: 'slide-florals-1', sectionId: 'florals', name: 'Bouquet', elements: bouquetElements, commentPins: [] },
    { id: 'slide-florals-2', sectionId: 'florals', name: 'Notes', elements: paletteElements, commentPins: [] },
  ];
}

function buildAttireSlides(images: BoardImage[]): Slide[] {
  const img = indexById(images);
  const bridalElements: CanvasElement[] = [];

  pushImage(bridalElements, img, 'el-att-bri-12', 'img-12', { x: 28, y: 28, width: 360, height: 380 }, 1);
  pushImage(bridalElements, img, 'el-att-bri-25', 'img-25', { x: 408, y: 28, width: 300, height: 220 }, 2);
  pushImage(bridalElements, img, 'el-att-bri-27', 'img-27', { x: 728, y: 28, width: 204, height: 220 }, 3);

  bridalElements.push(
    textElement('el-text-att-bri-title', 'Bridal', 408, 270, 300, 44, 10, {
      fontSize: 34,
      fontFamily: 'display',
      align: 'left',
    }),
    textElement(
      'el-text-att-bri-sub',
      'Lace that feels heirloom.\nMovement in the skirt.\nVeil optional, soft if worn.',
      408,
      322,
      300,
      100,
      11,
      { fontSize: 14, fontFamily: 'sans', color: '#6b6460', align: 'left', italic: true }
    ),
    textElement(
      'el-text-att-bri-note',
      'Ivory over stark white.\nNatural waist, no stiff ballgown.',
      728,
      270,
      204,
      120,
      12,
      { fontSize: 13, fontFamily: 'sans', color: '#5c4a3a', align: 'left' }
    ),
    textElement(
      'el-text-att-bri-footer',
      'Look: classic with air',
      28,
      430,
      360,
      50,
      13,
      { fontSize: 14, fontFamily: 'sans', color: '#c4a35a', align: 'left', bold: true }
    )
  );

  const groomElements: CanvasElement[] = [
    textElement('el-text-att-gr-title', 'Groom', 40, 36, 380, 48, 1, {
      fontSize: 32,
      fontFamily: 'display',
      align: 'left',
    }),
    textElement(
      'el-text-att-gr-body',
      'Relaxed tailoring that still photographs sharp — linen in the afternoon, a proper jacket for dinner.',
      40,
      100,
      380,
      100,
      2,
      { fontSize: 15, fontFamily: 'sans', color: '#6b6460', align: 'left', italic: true }
    ),
    textElement(
      'el-text-att-gr-list',
      'Direction\n• Neutral or soft sage tones\n• Minimal accessories\n• Comfortable shoes for dancing\n• Pocket square optional',
      40,
      220,
      380,
      180,
      3,
      { fontSize: 14, fontFamily: 'sans', color: '#1a1714', align: 'left' }
    ),
  ];

  pushImage(groomElements, img, 'el-att-gr-13', 'img-13', { x: 460, y: 36, width: 230, height: 420 }, 4);
  pushImage(groomElements, img, 'el-att-gr-26', 'img-26', { x: 710, y: 36, width: 220, height: 420 }, 5);

  groomElements.push(
    textElement('el-text-att-gr-footer', 'Tone: refined, not stiff', 40, 460, 380, 40, 6, {
      fontSize: 13,
      fontFamily: 'sans',
      color: '#c4a35a',
      align: 'left',
      bold: true,
    })
  );

  return [
    { id: 'slide-attire-1', sectionId: 'attire', name: 'Bridal', elements: bridalElements, commentPins: [] },
    { id: 'slide-attire-2', sectionId: 'attire', name: 'Groom', elements: groomElements, commentPins: [] },
  ];
}

function buildStationerySlides(images: BoardImage[]): Slide[] {
  const img = indexById(images);
  const suiteElements: CanvasElement[] = [];

  pushImage(suiteElements, img, 'el-sta-mood-21', 'img-21', { x: 28, y: 28, width: 420, height: 280 }, 1);
  pushImage(suiteElements, img, 'el-sta-mood-22', 'img-22', { x: 468, y: 28, width: 230, height: 180 }, 2);
  pushImage(suiteElements, img, 'el-sta-mood-23', 'img-23', { x: 718, y: 28, width: 214, height: 180 }, 3);

  suiteElements.push(
    textElement('el-text-sta-title', 'Stationery', 468, 230, 464, 44, 10, {
      fontSize: 34,
      fontFamily: 'display',
      align: 'left',
    }),
    textElement(
      'el-text-sta-sub',
      'Letterpress feel, warm paper,\nand type that reads like a letter.',
      468,
      284,
      464,
      70,
      11,
      { fontSize: 15, fontFamily: 'sans', color: '#6b6460', align: 'left', italic: true }
    ),
    textElement(
      'el-text-sta-caption',
      'Cream stock · soft charcoal ink · a single gold accent',
      28,
      330,
      420,
      50,
      12,
      { fontSize: 14, fontFamily: 'sans', color: '#5c4a3a', align: 'left', italic: true }
    ),
    textElement(
      'el-text-sta-note',
      'Suite: save the date → invite → day-of menu & place cards',
      468,
      370,
      464,
      50,
      13,
      { fontSize: 13, fontFamily: 'sans', color: '#a89f96', align: 'left' }
    ),
    textElement(
      'el-text-sta-footer',
      'Voice: intimate, handwritten spirit',
      28,
      460,
      900,
      40,
      14,
      { fontSize: 13, fontFamily: 'sans', color: '#c4a35a', align: 'left', bold: true }
    )
  );

  const dayOfElements: CanvasElement[] = [
    textElement('el-text-sta-day-title', 'Day-of paper', 40, 36, 440, 48, 1, {
      fontSize: 32,
      fontFamily: 'display',
      align: 'left',
    }),
    textElement(
      'el-text-sta-day-body',
      'Small pieces guests actually touch — menus at each setting, a welcome note, and clear place cards.',
      40,
      100,
      440,
      100,
      2,
      { fontSize: 15, fontFamily: 'sans', color: '#6b6460', align: 'left', italic: true }
    ),
    textElement(
      'el-text-sta-day-list',
      'Include\n• Ceremony program (one page)\n• Dinner menu\n• Place cards with first names\n\nKeep light\n• No oversized signage towers\n• No plastic holders',
      40,
      220,
      440,
      200,
      3,
      { fontSize: 14, fontFamily: 'sans', color: '#1a1714', align: 'left' }
    ),
  ];

  pushImage(dayOfElements, img, 'el-sta-day-24', 'img-24', { x: 520, y: 36, width: 400, height: 300 }, 4);

  dayOfElements.push(
    textElement(
      'el-text-sta-day-caption',
      'Paper weight: substantial enough to feel intentional.',
      520,
      360,
      400,
      60,
      5,
      { fontSize: 14, fontFamily: 'sans', color: '#5c4a3a', align: 'left', italic: true }
    ),
    textElement('el-text-sta-day-footer', 'Finish: letterpress or soft foil', 40, 460, 440, 40, 6, {
      fontSize: 13,
      fontFamily: 'sans',
      color: '#c4a35a',
      align: 'left',
      bold: true,
    })
  );

  return [
    { id: 'slide-stationery-1', sectionId: 'stationery', name: 'Suite', elements: suiteElements, commentPins: [] },
    { id: 'slide-stationery-2', sectionId: 'stationery', name: 'Day-of', elements: dayOfElements, commentPins: [] },
  ];
}

export function buildSlidesForSection(
  sectionId: string,
  sectionName: string,
  images: BoardImage[]
): Slide[] {
  const sectionImages = images.filter((img) => img.sectionId === sectionId);

  switch (sectionId) {
    case 'ceremony':
      return buildCeremonySlides(sectionImages);
    case 'reception':
      return buildReceptionSlides(sectionImages);
    case 'florals':
      return buildFloralsSlides(sectionImages);
    case 'attire':
      return buildAttireSlides(sectionImages);
    case 'stationery':
      return buildStationerySlides(sectionImages);
    default:
      break;
  }

  return [
    {
      id: `slide-${sectionId}-1`,
      sectionId,
      name: 'Slide 1',
      elements: [
        textElement(`el-text-${sectionId}-1`, `${sectionName} mood`, 180, 220, 600, 100, 1),
      ],
      commentPins: [],
    },
  ];
}

function ceremonySamplePins(): CommentPin[] {
  return [
    {
      id: 'pin-c1',
      createdAt: '2026-05-02T09:12:00.000Z',
      x: 200,
      y: 140,
      comments: [
        {
          id: 'c1',
          authorId: '2',
          authorName: 'Alexander Lee',
          authorInitials: 'AL',
          text: 'Love this arch style — can we do something similar with more trailing greenery?',
          timestamp: '2 days ago',
          replies: [
            {
              id: 'c1r1',
              authorId: '1',
              authorName: 'Stephanie Chang',
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
      createdAt: '2026-05-04T15:40:00.000Z',
      x: 560,
      y: 320,
      comments: [
        {
          id: 'c2',
          authorId: '1',
          authorName: 'Stephanie Chang',
          authorInitials: 'SC',
          text: 'The stone backdrop here matches Rosewood Estate perfectly.',
          timestamp: '3 days ago',
          resolved: true,
          resolvedBy: 'Stephanie Chang',
        },
      ],
    },
    {
      id: 'pin-c3',
      createdAt: '2026-05-06T11:05:00.000Z',
      x: 820,
      y: 260,
      comments: [
        {
          id: 'c3',
          authorId: '2',
          authorName: 'Alexander Lee',
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
    fontFamily: 'display',
    color: '#1a1714',
    align: 'center',
    bold: false,
    italic: false,
  };
}

/**
 * A new shape, centred on the slide. Outlined rather than filled by default: an empty
 * outline reads as "a shape you are about to style", while a solid block reads as a
 * mistake and has to be undone before it can be used.
 */
export function defaultShapeElement(shape: ShapeKind): ShapeElement {
  const isLine = shape === 'line';
  const width = isLine ? 320 : 220;
  const height = isLine ? 2 : 180;
  return {
    id: `el-shape-${Date.now()}`,
    type: 'shape',
    shape,
    x: SLIDE_WIDTH / 2 - width / 2,
    y: SLIDE_HEIGHT / 2 - height / 2,
    width,
    height,
    zIndex: 10,
    stroke: '#1a1714',
    strokeWidth: 2,
    strokeStyle: 'solid',
    fill: isLine ? undefined : 'transparent',
    ...(shape === 'rect' ? { radius: 0 } : {}),
    ...(shape === 'polygon' ? { sides: 5 } : {}),
  };
}

export function defaultImageElement(imageId: string, zIndex: number): ImageElement {
  return {
    id: `el-${imageId}-${Date.now()}`,
    type: 'image',
    imageId,
    x: 80,
    y: 60,
    width: 400,
    height: 300,
    zIndex,
  };
}
