import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useBoard } from '../context/BoardContext';
import { CanvasElementView } from './CanvasElementView';
import { CommentPinMarker } from './CommentPinMarker';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../types';

/** Small enough never to clip a real column; large enough that a zero-width measure
 *  doesn't render an invisible slide. */
const MIN_SCALE = 0.08;

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
    isPlacingComment,
    placeCommentPin,
  } = useBoard();
  const containerRef = useRef<HTMLDivElement>(null);
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
      className={`slide-canvas-wrap ${fullWidth ? 'slide-canvas-fullwidth' : ''}`}
      ref={containerRef}
    >
      <div
        ref={artboardRef}
        className={`slide-artboard ${isPlacingComment ? 'placing-comment' : ''}`}
        style={{
          width: SLIDE_WIDTH * scale,
          height: SLIDE_HEIGHT * scale,
          ...(activeSlide.background ? { background: activeSlide.background } : {}),
        }}
        onMouseDown={(e) => {
          // Only a click on the artboard itself, not on something standing on it.
          if (isPlacingComment || readOnly || e.target !== e.currentTarget) return;
          selectSlide();
        }}
        onClick={handleArtboardClick}
      >
        {sortedElements.map((element) => (
          <CanvasElementView
            key={element.id}
            element={element}
            slideId={activeSlideId}
            scale={scale}
            readOnly={readOnly}
          />
        ))}
        {!readOnly &&
          activeSlide.commentPins.map((pin, index) => (
            <CommentPinMarker
              key={pin.id}
              pin={pin}
              pinIndex={index + 1}
              scale={scale}
            />
          ))}
      </div>
    </div>
  );
}
