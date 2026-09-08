import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownToLine, ArrowUpToLine, Download, Trash2 } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { downloadImage, imageFilename } from '../utils/downloadImage';
import { useHost } from '../embed/HostProvider';

interface ElementContextMenuProps {
  slideId: string;
  elementId: string;
  /** Present for image elements; adds the download action. */
  imageUrl?: string;
  at: { x: number; y: number };
  onClose: () => void;
}

/**
 * Right-click menu for a canvas element. Portalled to <body>: the draggable box
 * is transformed, which would otherwise anchor a fixed-position menu to it.
 */
export function ElementContextMenu({
  slideId,
  elementId,
  imageUrl,
  at,
  onClose,
}: ElementContextMenuProps) {
  const { bringToFront, sendToBack, deleteElement, activeSectionName } = useBoard();
  const { portalHost } = useHost();

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
          bringToFront(slideId, elementId);
        }}
      >
        <ArrowUpToLine size={13} strokeWidth={1.6} />
        Bring to front
      </button>
      <button
        type="button"
        className="canvas-context-item"
        onClick={() => {
          onClose();
          sendToBack(slideId, elementId);
        }}
      >
        <ArrowDownToLine size={13} strokeWidth={1.6} />
        Send to back
      </button>
      {imageUrl && (
        <>
          <span className="canvas-context-divider" />
          <button
            type="button"
            className="canvas-context-item"
            onClick={() => {
              onClose();
              void downloadImage(imageUrl, imageFilename(imageUrl, activeSectionName));
            }}
          >
            <Download size={13} strokeWidth={1.6} />
            Download image
          </button>
        </>
      )}
      <span className="canvas-context-divider" />
      <button
        type="button"
        className="canvas-context-item is-danger"
        onClick={() => {
          onClose();
          deleteElement(slideId, elementId);
        }}
      >
        <Trash2 size={13} strokeWidth={1.6} />
        Delete
      </button>
    </div>,
    portalHost
  );
}
