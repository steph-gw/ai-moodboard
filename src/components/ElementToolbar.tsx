import { ArrowDownToLine, ArrowUpToLine, Download, Trash2 } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { TextFormatControls } from './TextFormatBar';
import { downloadImage, imageFilename } from '../utils/downloadImage';

/**
 * The toolbar for whatever is selected, floating over the top of the stage.
 *
 * It floats because it used to sit in the header, where showing it pushed the stage down —
 * and since the artboard scales to fit its container, selecting a text box visibly shrank
 * the slide. Out of flow, the canvas holds still.
 */
export function ElementToolbar() {
  const {
    activeSlide,
    activeSlideId,
    selectedElementId,
    canEdit,
    bringToFront,
    sendToBack,
    deleteElement,
    getImageById,
    activeSectionName,
  } = useBoard();

  const element = activeSlide?.elements.find((el) => el.id === selectedElementId);
  if (!element || !activeSlideId || !canEdit) return null;

  const imageUrl = element.type === 'image' ? getImageById(element.imageId)?.url : undefined;

  return (
    <div className="element-toolbar" onPointerDown={(e) => e.stopPropagation()}>
      {element.type === 'text' && (
        <>
          <TextFormatControls element={element} slideId={activeSlideId} />
          <span className="text-format-divider" />
        </>
      )}

      <button
        type="button"
        className="text-format-btn"
        onClick={() => bringToFront(activeSlideId, element.id)}
        data-tooltip="Bring to front"
        aria-label="Bring to front"
      >
        <ArrowUpToLine size={13} strokeWidth={1.7} />
      </button>
      <button
        type="button"
        className="text-format-btn"
        onClick={() => sendToBack(activeSlideId, element.id)}
        data-tooltip="Send to back"
        aria-label="Send to back"
      >
        <ArrowDownToLine size={13} strokeWidth={1.7} />
      </button>

      {imageUrl && (
        <button
          type="button"
          className="text-format-btn"
          onClick={() => void downloadImage(imageUrl, imageFilename(imageUrl, activeSectionName))}
          data-tooltip="Download image"
          aria-label="Download image"
        >
          <Download size={13} strokeWidth={1.7} />
        </button>
      )}

      <span className="text-format-divider" />

      <button
        type="button"
        className="text-format-btn is-danger"
        onClick={() => deleteElement(activeSlideId, element.id)}
        data-tooltip="Delete"
        aria-label="Delete"
      >
        <Trash2 size={13} strokeWidth={1.7} />
      </button>
    </div>
  );
}
