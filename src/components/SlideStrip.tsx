import { useEffect, useRef, useState } from 'react';
import { Plus, Copy, Trash2 } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import type { CanvasElement, Slide } from '../types';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../types';
import { textFontCss } from '../utils/textFonts';

function MiniElement({
  element,
  getImageUrl,
}: {
  element: CanvasElement;
  getImageUrl: (imageId: string) => string | undefined;
}) {
  const style = {
    position: 'absolute' as const,
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    zIndex: element.zIndex,
    overflow: 'hidden' as const,
  };

  if (element.type === 'image') {
    const url = getImageUrl(element.imageId);
    return (
      <div className="slide-mini-image" style={style}>
        {url ? <img src={url} alt="" draggable={false} /> : null}
      </div>
    );
  }

  return (
    <div
      className="slide-mini-text"
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
        whiteSpace: 'pre-wrap',
      }}
    >
      {element.content}
    </div>
  );
}

function SlideMiniPreview({ slide }: { slide: Slide }) {
  const { getImageById } = useBoard();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.12);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      if (width > 0) setScale(width / SLIDE_WIDTH);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sorted = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div ref={containerRef} className="slide-tab-preview">
      <div
        className="slide-tab-mini"
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${scale})`,
        }}
        aria-hidden
      >
        {sorted.map((element) => (
          <MiniElement
            key={element.id}
            element={element}
            getImageUrl={(imageId) => getImageById(imageId)?.url}
          />
        ))}
      </div>
    </div>
  );
}

function SlideThumbnail({ slideId, index }: { slideId: string; index: number }) {
  const {
    board,
    activeSectionId,
    activeSlideId,
    setActiveSlideId,
    selectElement,
  } = useBoard();

  const section = board.sections.find((s) => s.id === activeSectionId);
  const slide = section?.slides.find((s) => s.id === slideId);
  const isActive = activeSlideId === slideId;

  if (!slide) return null;

  return (
    <button
      type="button"
      className={`slide-tab ${isActive ? 'active' : ''}`}
      onClick={() => {
        setActiveSlideId(slideId);
        const imgEl = slide.elements.find((el) => el.type === 'image');
        if (imgEl) {
          selectElement(imgEl.id);
        } else {
          selectElement(null);
        }
      }}
    >
      <span className="slide-tab-index">{index + 1}</span>
      <SlideMiniPreview slide={slide} />
    </button>
  );
}

export function SlideStrip() {
  const { board, activeSectionId, role, addSlide, deleteSlide, duplicateSlide, activeSlideId } =
    useBoard();
  const isPlanner = role === 'planner';

  const section = board.sections.find((s) => s.id === activeSectionId);
  if (!section) return null;

  return (
    <aside className="slide-strip" aria-label="Slides">
      <div className="slide-strip-scroll">
        {section.slides.map((slide, index) => (
          <SlideThumbnail key={slide.id} slideId={slide.id} index={index} />
        ))}
        {isPlanner && (
          <button type="button" className="slide-tab slide-tab-add" onClick={addSlide}>
            <Plus size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>
      {isPlanner && activeSlideId && section.slides.length > 1 && (
        <div className="slide-strip-actions">
          <button
            type="button"
            className="slide-action-btn"
            onClick={() => duplicateSlide(activeSlideId)}
            title="Duplicate slide"
          >
            <Copy size={13} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="slide-action-btn"
            onClick={() => deleteSlide(activeSlideId)}
            title="Delete slide"
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </aside>
  );
}
