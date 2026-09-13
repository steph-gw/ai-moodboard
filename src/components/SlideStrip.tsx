import { useEffect, useRef, useState } from 'react';
import { SlideContextMenu } from './SlideContextMenu';
import { Copy, CopyPlus, Lock, Plus, Trash2 } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { useHost } from '../embed/HostProvider';
import { ShapeView } from './ShapeView';
import { PaletteGroupView, SwatchView } from './SwatchView';
import type { CanvasElement, Slide } from '../types';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../types';
import { letterSpacingCss, textFontCss } from '../utils/textFonts';

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

  if (element.type === 'shape') {
    return (
      <div className="slide-mini-shape" style={style}>
        <ShapeView element={element} />
      </div>
    );
  }

  if (element.type === 'paletteGroup') {
    return (
      <div className="slide-mini-shape" style={style}>
        {/* Captions are unreadable at thumbnail size; the colors are the point here. */}
        <PaletteGroupView element={{ ...element, showHex: false }} />
      </div>
    );
  }

  if (element.type === 'swatch') {
    // The caption is unreadable at thumbnail size, so the chip stands alone. The colors
    // are what the filmstrip is being read for anyway.
    return (
      <div className="slide-mini-shape" style={style}>
        <SwatchView element={{ ...element, showHex: false }} />
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
        letterSpacing: letterSpacingCss(element.letterSpacing),
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
          // The thumbnail is the slide seen small, so a slide with a colour behind it is
          // that colour here too — otherwise picking a background leaves the filmstrip
          // showing a row of white cards that no longer match anything on the stage.
          ...(slide.background ? { background: slide.background } : {}),
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
    canManage,
    canEdit,
    deleteSlide,
    duplicateSlide,
    copySlide,
    lockedSlideIds,
    unlockedSlideIds,
  } = useBoard();
  const { features } = useHost();
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);

  const section = board.sections.find((s) => s.id === activeSectionId);
  const slide = section?.slides.find((s) => s.id === slideId);
  const isActive = activeSlideId === slideId;
  // Approval freezes every slide in the section, so they all wear the padlock — the
  // filmstrip is where you look to see which slides are closed. Mirrors the stage padlock
  // exactly, override included: a slide opened back up while its section stays approved is
  // not locked, and the thumbnail must not claim otherwise.
  const locked =
    features.slideLocking &&
    (lockedSlideIds.has(slideId) || section?.status === 'approved') &&
    !unlockedSlideIds.has(slideId);
  // Removing a slide takes other people's work with it, so it stays a planner action —
  // and a frozen section (locked slide or approved) refuses it like any other edit.
  const canDelete = canManage && canEdit && (section?.slides.length ?? 0) > 1;

  if (!slide) return null;

  const select = () => {
    setActiveSlideId(slideId);
    const imgEl = slide.elements.find((el) => el.type === 'image');
    selectElement(imgEl ? imgEl.id : null);
  };

  return (
    <div
      className={`slide-tab ${isActive ? 'active' : ''} ${locked ? 'is-locked' : ''}`}
      // Right-clicking a thumbnail is where people look for "copy this slide", so that is
      // where it is — the buttons and the shortcut are the same actions by other routes.
      onContextMenu={(e) => {
        e.preventDefault();
        setActiveSlideId(slideId);
        setMenuAt({ x: e.clientX, y: e.clientY });
      }}
      onKeyDown={(e) => {
        // Focus is inside the filmstrip, so Delete/Backspace removes the whole
        // slide rather than the element selected on the canvas.
        if (e.key !== 'Delete' && e.key !== 'Backspace') return;
        if (!canDelete || !isActive) return;
        e.preventDefault();
        e.stopPropagation();
        deleteSlide(slideId);
      }}
    >
      <span className="slide-tab-index">{index + 1}</span>
      <div className="slide-tab-body">
        <button
          type="button"
          className="slide-tab-hit"
          aria-current={isActive}
          aria-label={`Slide ${index + 1}`}
          onClick={select}
        >
          <SlideMiniPreview slide={slide} />
          {/* A lock is easy to forget you set, and the only other sign of it is a toolbar
              that isn't there. Mark it where the slides are listed. */}
          {locked && (
            <span className="slide-tab-lock" title="Locked">
              <Lock size={10} strokeWidth={2} />
            </span>
          )}
        </button>
        {canEdit && (
          <div className="slide-tab-actions">
            <button
              type="button"
              className="slide-hover-btn"
              data-tooltip="Duplicate"
              aria-label="Duplicate slide"
              onClick={(e) => {
                e.stopPropagation();
                duplicateSlide(slideId);
              }}
            >
              <CopyPlus size={12} strokeWidth={1.75} />
            </button>
            {/* Duplicate puts a second copy here; copy takes one away with you, to be
                pasted into whichever section you open next. Different enough to be worth
                its own button rather than a mode of the first. */}
            <button
              type="button"
              className="slide-hover-btn"
              data-tooltip="Copy slide"
              aria-label="Copy slide"
              onClick={(e) => {
                e.stopPropagation();
                copySlide(slideId);
              }}
            >
              <Copy size={12} strokeWidth={1.75} />
            </button>
            {canDelete && (
              <button
                type="button"
                className="slide-hover-btn"
                data-tooltip="Delete"
                aria-label="Delete slide"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSlide(slideId);
                }}
              >
                <Trash2 size={12} strokeWidth={1.75} />
              </button>
            )}
          </div>
        )}
      </div>
      {menuAt && (
        <SlideContextMenu slideId={slideId} at={menuAt} onClose={() => setMenuAt(null)} />
      )}
    </div>
  );
}

export function SlideStrip() {
  const { board, activeSectionId, canEdit, addSlide } = useBoard();
  
  const section = board.sections.find((s) => s.id === activeSectionId);
  if (!section) return null;

  return (
    <aside className="slide-strip" aria-label="Slides">
      <div className="slide-strip-scroll">
        {section.slides.map((slide, index) => (
          <SlideThumbnail key={slide.id} slideId={slide.id} index={index} />
        ))}
        {canEdit && (
          <button type="button" className="slide-tab-add" onClick={addSlide} data-tooltip="Add slide" aria-label="Add slide">
            <Plus size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </aside>
  );
}
