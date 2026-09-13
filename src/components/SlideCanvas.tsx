import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useBoard } from '../context/BoardContext';
import { CanvasElementView } from './CanvasElementView';
import { CommentPinMarker } from './CommentPinMarker';
import { PinComposer } from './PinComposer';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../types';
import { buildPinNumbers } from '../utils/commentHelpers';

/** Small enough never to clip a real column; large enough that a zero-width measure
 *  doesn't render an invisible slide. */
const MIN_SCALE = 0.08;
/** Screen px of movement before a press counts as a marquee rather than a click. */
const MARQUEE_THRESHOLD = 4;

interface SlideCanvasProps {
  fullWidth?: boolean;
  readOnly?: boolean;
  fitMode?: 'width' | 'contain';
  /** Rendered artboard width in px, so the header above can line up with the slide. */
  onWidthChange?: (width: number) => void;
}

export function SlideCanvas({
  fullWidth = true,
  readOnly = false,
  fitMode = 'width',
  onWidthChange,
}: SlideCanvasProps) {
  const {
    activeSlide,
    activeSlideId,
    selectSlide,
    selectElements,
    isPlacingComment,
    placeCommentPin,
    selectedCommentPinId,
    board,
    isSlideSelected,
    canEdit,
  } = useBoard();
  const pinNumbers = buildPinNumbers(board);
  const containerRef = useRef<HTMLDivElement>(null);
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      // The floor only exists to stop a container that momentarily measures zero from
      // collapsing the slide to nothing. It used to be 0.3, which is 288px wide — so in a
      // narrow column the slide stopped shrinking and spilled out of it instead.
      if (fitMode === 'contain') {
        const scaleX = width / SLIDE_WIDTH;
        const scaleY = height / SLIDE_HEIGHT;
        setScale(Math.max(MIN_SCALE, Math.min(scaleX, scaleY)));
        return;
      }

      if (fullWidth) {
        setScale(Math.max(width / SLIDE_WIDTH, MIN_SCALE));
        return;
      }

      const maxHeight = Math.max(height - 24, 150);
      const scaleX = width / SLIDE_WIDTH;
      const scaleY = maxHeight / SLIDE_HEIGHT;
      setScale(Math.max(MIN_SCALE, Math.min(scaleX, scaleY)));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);

    // ResizeObserver only delivers while the document is rendering, so a board that is
    // resized while hidden — a Bubble group that is toggled, a background tab — comes back
    // with the scale it had when it went away. Remeasuring on resize and on becoming
    // visible costs nothing and closes that gap.
    window.addEventListener('resize', updateScale);
    document.addEventListener('visibilitychange', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
      document.removeEventListener('visibilitychange', updateScale);
    };
  }, [activeSlideId, fullWidth, fitMode]);

  useEffect(() => {
    onWidthChange?.(SLIDE_WIDTH * scale);
  }, [scale, onWidthChange]);

  /**
   * Rubber-band selection: press and drag a rectangle.
   *
   * It starts on bare artboard *or* in the margin around it. The margin used to select the
   * slide the instant it was pressed, which meant the one place with guaranteed empty space
   * — the only place left to start from on a full collage — was the one place you could not
   * drag a selection from.
   *
   * Anything the rectangle touches is selected, rather than only what it fully encloses —
   * on a dense collage the enclosing rule means dragging across four overlapping photos
   * selects none of them.
   *
   * A press that never moves is a click, and selects the slide. The threshold is what
   * keeps a slightly shaky click from wiping the selection.
   */
  const startMarquee = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isPlacingComment || readOnly || e.target !== e.currentTarget || e.button !== 0) return;
    const artboard = artboardRef.current;
    if (!artboard || !activeSlide) return;

    const rect = artboard.getBoundingClientRect();
    const toSlide = (cx: number, cy: number) => ({
      x: (cx - rect.left) / scale,
      y: (cy - rect.top) / scale,
    });
    // A press that began in the margin sits outside the slide. Measure the gesture in raw
    // slide space so the drag threshold is honest, and clamp only the rectangle — it is
    // drawn inside the artboard, and an unclamped one would spill past its edges.
    const clamp = (p: { x: number; y: number }) => ({
      x: Math.min(Math.max(p.x, 0), SLIDE_WIDTH),
      y: Math.min(Math.max(p.y, 0), SLIDE_HEIGHT),
    });
    const origin = toSlide(e.clientX, e.clientY);
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      const raw = toSlide(ev.clientX, ev.clientY);
      if (
        !moved &&
        Math.max(Math.abs(raw.x - origin.x), Math.abs(raw.y - origin.y)) * scale <
          MARQUEE_THRESHOLD
      ) {
        return;
      }
      moved = true;
      const from = clamp(origin);
      const at = clamp(raw);
      const box = {
        x: Math.min(from.x, at.x),
        y: Math.min(from.y, at.y),
        width: Math.abs(at.x - from.x),
        height: Math.abs(at.y - from.y),
      };
      setMarquee(box);
      selectElements(
        activeSlide.elements
          .filter(
            (el) =>
              el.x < box.x + box.width &&
              el.x + el.width > box.x &&
              el.y < box.y + box.height &&
              el.y + el.height > box.y
          )
          .map((el) => el.id)
      );
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setMarquee(null);
      if (!moved) selectSlide();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleArtboardClick = (e: MouseEvent<HTMLDivElement>) => {
    if (readOnly || !isPlacingComment || !artboardRef.current) return;
    const rect = artboardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    if (x >= 0 && x <= SLIDE_WIDTH && y >= 0 && y <= SLIDE_HEIGHT) {
      placeCommentPin(x, y);
    }
  };

  if (!activeSlide || !activeSlideId) {
    return (
      <div className="slide-canvas-wrap slide-canvas-empty">
        <p>No slide selected</p>
      </div>
    );
  }

  const sortedElements = [...activeSlide.elements].sort(
    (a, b) => a.zIndex - b.zIndex
  );

  return (
    <div
      // is-static covers present mode and the export sheet; a locked or approved slide is
      // the same thing on the live board — nothing here moves, so nothing should offer to.
      className={`slide-canvas-wrap ${fullWidth ? 'slide-canvas-fullwidth' : ''} ${
        readOnly || !canEdit ? 'is-static' : ''
      }`}
      ref={containerRef}
      // Selecting the slide by clicking bare artboard only works while there is bare
      // artboard left. On a full collage every pixel belongs to an element, so the slide —
      // and with it the background control — became unreachable. The margin around the
      // artboard is always there: a click there selects the slide, a drag rubber-bands.
      onPointerDown={startMarquee}
    >
      <div
        ref={artboardRef}
        className={`slide-artboard ${isPlacingComment ? 'placing-comment' : ''} ${
          isSlideSelected && !readOnly ? 'is-selected' : ''
        }`}
        style={{
          width: SLIDE_WIDTH * scale,
          height: SLIDE_HEIGHT * scale,
          ...(activeSlide.background ? { background: activeSlide.background } : {}),
        }}
        onPointerDown={startMarquee}
        onClick={handleArtboardClick}
      >
        {/* Where every selected element's ring and handles are drawn, above the elements
            themselves. Inside its own element, a handle is painted over by whatever is
            stacked above that element — and lifting the element to fix it would restack
            the slide on every click. */}
        <div className="selection-layer" aria-hidden />
        {sortedElements.map((element) => (
          <CanvasElementView
            key={element.id}
            element={element}
            slideId={activeSlideId}
            scale={scale}
            readOnly={readOnly}
          />
        ))}
        {isSlideSelected && !readOnly && (
          <>
            <span className="slide-select-corner is-sw" aria-hidden />
            <span className="slide-select-corner is-se" aria-hidden />
          </>
        )}
        {marquee && (
          <div
            className="marquee"
            style={{
              left: marquee.x * scale,
              top: marquee.y * scale,
              width: marquee.width * scale,
              height: marquee.height * scale,
            }}
          />
        )}
        {!readOnly &&
          activeSlide.commentPins.map((pin) => (
            <CommentPinMarker
              key={pin.id}
              pin={pin}
              pinIndex={pinNumbers.get(pin.id) ?? 0}
              scale={scale}
            />
          ))}
        {/* Only for a pin with nothing on it yet: once there is a conversation, the
            drawer is the place for it. */}
        {!readOnly &&
          activeSlide.commentPins
            .filter((pin) => pin.id === selectedCommentPinId && pin.comments.length === 0)
            .map((pin) => (
              <PinComposer
                key={pin.id}
                pin={pin}
                scale={scale}
                boardWidth={SLIDE_WIDTH * scale}
                boardHeight={SLIDE_HEIGHT * scale}
              />
            ))}
      </div>
    </div>
  );
}
