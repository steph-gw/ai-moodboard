import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useBoard } from '../context/BoardContext';
import { useHost } from '../embed/HostProvider';
import { SlideCanvas } from './SlideCanvas';
import { exitFullscreen, isFullscreen } from '../utils/fullscreen';

const HINT_DURATION_MS = 3200;

export function PresentOverlay() {
  const {
    setPresenting,
    goToNextSlide,
    goToPrevSlide,
    selectCommentPin,
    selectElement,
  } = useBoard();
  const { portalHost } = useHost();

  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    selectCommentPin(null);
    selectElement(null);
  }, [selectCommentPin, selectElement]);

  // "To exit full screen, press ESC", Google-Slides style: shows on entry, then fades.
  useEffect(() => {
    const timer = window.setTimeout(() => setShowHint(false), HINT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // Leaving browser fullscreen (Esc, F11, the OS chrome) also leaves the deck.
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!isFullscreen()) setPresenting(false);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [setPresenting]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // In real fullscreen the browser consumes Escape itself and we exit via
      // fullscreenchange; this covers the case where fullscreen was refused.
      if (e.key === 'Escape') {
        void exitFullscreen();
        setPresenting(false);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
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

  // Portalled out of the element for the same reason menus and modals are: .gw-mb isolates
  // its stacking context, so nothing inside it can paint above the host page's own floating
  // header and sidebar however high its z-index. Present mode has to cover the page, not
  // just our corner of it.
  return createPortal(
    <div className="present-overlay">
      <div className={`present-hint-toast ${showHint ? '' : 'hidden'}`} role="status">
        To exit full screen, press ESC
      </div>
      <div className="present-slide-area">
        <SlideCanvas fullWidth readOnly fitMode="contain" />
      </div>
    </div>,
    portalHost
  );
}
