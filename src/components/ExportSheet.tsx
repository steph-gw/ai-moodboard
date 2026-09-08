import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBoard } from '../context/BoardContext';
import type { CanvasElement } from '../types';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../types';
import { textFontCss } from '../utils/textFonts';

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

  return (
    <div
      className="export-text"
      style={{
        ...style,
        fontSize: element.fontSize,
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
export function ExportSheet() {
  const { board, getImageById } = useBoard();
  // Portals need a DOM, and this one renders on every page load, so wait for
  // the client rather than reaching for document during SSR.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const pages = board.sections.flatMap((section) =>
    section.slides.map((slide) => ({ key: `${section.id}-${slide.id}`, slide }))
  );

  if (!mounted) return null;

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
    document.body
  );
}
