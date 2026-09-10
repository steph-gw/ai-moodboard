import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useBoard } from '../context/BoardContext';
import { CanvasElementView } from './CanvasElementView';
import { CommentPinMarker } from './CommentPinMarker';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../types';

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
    selectElement,
    selectCommentPin,
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

      if (fitMode === 'contain') {
        const scaleX = width / SLIDE_WIDTH;
        const scaleY = height / SLIDE_HEIGHT;
        setScale(Math.max(0.3, Math.min(scaleX, scaleY)));
        return;
      }

      if (fullWidth) {
        setScale(Math.max(width / SLIDE_WIDTH, 0.3));
        return;
      }

      const maxHeight = Math.max(height - 24, 150);
      const scaleX = width / SLIDE_WIDTH;
      const scaleY = maxHeight / SLIDE_HEIGHT;
      setScale(Math.max(0.3, Math.min(scaleX, scaleY)));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
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
        }}
        onMouseDown={() => {
          if (!isPlacingComment && !readOnly) {
            selectElement(null);
            selectCommentPin(null);
          }
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
