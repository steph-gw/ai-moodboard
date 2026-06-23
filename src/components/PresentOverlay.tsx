import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useBoard } from '../context/BoardContext';
import { SlideCanvas } from './SlideCanvas';

export function PresentOverlay() {
  const {
    setPresenting,
    activeSectionName,
    activeSlide,
    board,
    activeSectionId,
    goToNextSlide,
    goToPrevSlide,
    selectCommentPin,
    selectElement,
  } = useBoard();

  const section = board.sections.find((s) => s.id === activeSectionId);
  const slideIndex = section?.slides.findIndex((s) => s.id === activeSlide?.id) ?? 0;

  useEffect(() => {
    selectCommentPin(null);
    selectElement(null);
  }, [selectCommentPin, selectElement]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPresenting(false);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToNextSlide();
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrevSlide();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setPresenting, goToNextSlide, goToPrevSlide]);

  return (
    <div className="present-overlay">
      <div className="present-chrome">
        <span className="present-title">
          {board.weddingName} · {activeSectionName}
          {activeSlide && ` · ${activeSlide.name}`}
        </span>
        <button
          type="button"
          className="present-exit"
          onClick={() => setPresenting(false)}
          aria-label="Exit presentation"
        >
          <X size={16} strokeWidth={1.5} />
          Exit
        </button>
      </div>
      <div className="present-slide-area">
        <SlideCanvas fullWidth readOnly fitMode="contain" />
      </div>
      {section && section.slides.length > 1 && (
        <div className="present-slide-count">
          Slide {slideIndex + 1} of {section.slides.length}
          <span className="present-hint"> · ← → to navigate</span>
        </div>
      )}
    </div>
  );
}
