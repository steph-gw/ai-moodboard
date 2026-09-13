import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardPaste, Copy, CopyPlus, Trash2 } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { useHost } from '../embed/HostProvider';

/**
 * Right-click menu for a slide in the filmstrip.
 *
 * Separate from the element menu because it acts on a different thing: that one is about
 * an object on the canvas, this one about the slide holding them. Right-clicking a
 * thumbnail is the gesture people already try, so it is where copy and paste live —
 * carrying a slide to another section is otherwise a keyboard shortcut you have to know.
 *
 * Portalled for the same reason the element menu is: the filmstrip scrolls, and a menu
 * positioned inside it would be clipped by that scroller.
 */
export function SlideContextMenu({
  slideId,
  at,
  onClose,
}: {
  slideId: string;
  at: { x: number; y: number };
  onClose: () => void;
}) {
  const {
    copySlide,
    pasteSlide,
    copiedSlideName,
    duplicateSlide,
    deleteSlide,
    canEdit,
    canManage,
    board,
    activeSectionId,
  } = useBoard();
  const { portalHost } = useHost();

  const section = board.sections.find((s) => s.id === activeSectionId);
  const canDelete = canManage && canEdit && (section?.slides.length ?? 0) > 1;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', onClose);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, true);
    return () => {
      window.removeEventListener('pointerdown', onClose);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="canvas-context-menu"
      style={{ left: at.x, top: at.y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="canvas-context-item"
        onClick={() => {
          onClose();
          copySlide(slideId);
        }}
      >
        <Copy size={13} strokeWidth={1.6} />
        Copy slide
      </button>
      {/* Only once something has been copied, and named so it is clear which slide is
          about to land — you may have crossed two sections since copying it. */}
      {canEdit && copiedSlideName && (
        <button
          type="button"
          className="canvas-context-item"
          onClick={() => {
            onClose();
            void pasteSlide();
          }}
        >
          <ClipboardPaste size={13} strokeWidth={1.6} />
          Paste “{copiedSlideName}”
        </button>
      )}
      {canEdit && (
        <button
          type="button"
          className="canvas-context-item"
          onClick={() => {
            onClose();
            void duplicateSlide(slideId);
          }}
        >
          <CopyPlus size={13} strokeWidth={1.6} />
          Duplicate
        </button>
      )}
      {canDelete && (
        <>
          <span className="canvas-context-divider" />
          <button
            type="button"
            className="canvas-context-item is-danger"
            onClick={() => {
              onClose();
              void deleteSlide(slideId);
            }}
          >
            <Trash2 size={13} strokeWidth={1.6} />
            Delete slide
          </button>
        </>
      )}
    </div>,
    portalHost
  );
}
