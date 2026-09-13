import { createPortal } from 'react-dom';
import { useBoard } from '../context/BoardContext';
import type { CanvasElement } from '../types';
import { DEFAULT_LINE_HEIGHT, SLIDE_HEIGHT, SLIDE_WIDTH } from '../types';
import { textFontCss } from '../utils/textFonts';
import { ShapeView } from './ShapeView';
import { SwatchView } from './SwatchView';

/**
 * One slide element, rendered flat at full size — no selection chrome, comment
 * pins or vote controls, so a printed page shows only the artwork.
 */
function StaticElement({
  element,
  imageUrl,
}: {
  element: CanvasElement;
  imageUrl?: string;
}) {
  const style = {
    position: 'absolute' as const,
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    zIndex: element.zIndex,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
  };

  if (element.type === 'image') {
    return (
      <div className="export-image" style={style}>
        {imageUrl ? <img src={imageUrl} alt="" /> : null}
      </div>
    );
  }

  if (element.type === 'shape') {
    return (
      <div className="export-shape" style={style}>
        <ShapeView element={element} />
      </div>
    );
  }

  if (element.type === 'swatch') {
    return (
      <div className="export-shape" style={style}>
        <SwatchView element={element} />
      </div>
    );
  }

  return (
    <div
      className="export-text"
      style={{
        ...style,
        fontSize: element.fontSize,
        lineHeight: element.lineHeight ?? DEFAULT_LINE_HEIGHT,
        fontFamily: textFontCss(element.fontFamily),
        fontWeight: element.bold ? 700 : 400,
        fontStyle: element.italic ? 'italic' : 'normal',
        color: element.color,
        textAlign: element.align,
        justifyContent:
          element.align === 'left'
            ? 'flex-start'
            : element.align === 'right'
              ? 'flex-end'
              : 'center',
      }}
    >
      {element.content}
    </div>
  );
}

/**
 * Print-only rendering of every slide in the board, one 16:9 page each.
 * Hidden on screen; the print stylesheet hides the app and reveals this, so
 * "Save as PDF" in the browser's print dialog yields a slides-only deck.
 */
export function ExportSheet({ target }: { target: HTMLElement | null }) {
  const { board, getImageById } = useBoard();

  // Every slide of every section — the whole board, as a deck.
  const pages = board.sections.flatMap((section) =>
    section.slides.map((slide) => ({ key: `${section.id}-${slide.id}`, slide }))
  );

  // Only mounted during an export. Rendering it permanently meant every slide's images
  // loading on page load, hidden, for a feature most visits never use.
  if (!target) return null;

  return createPortal(
    <div className="export-sheet" aria-hidden>
      {pages.map(({ key, slide }) => (
        <div
          key={key}
          className="export-page"
          style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT }}
        >
          {[...slide.elements]
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((element) => (
              <StaticElement
                key={element.id}
                element={element}
                imageUrl={
                  element.type === 'image'
                    ? getImageById(element.imageId)?.url
                    : undefined
                }
              />
            ))}
        </div>
      ))}
    </div>,
    target
  );
}
