import { useLayoutEffect, useRef, useState } from 'react';
import { BringToFront, Download, SendToBack, Trash2 } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { downloadImage, imageFilename } from '../utils/downloadImage';
import { ShapeFormatControls } from './ShapeFormatControls';

const GAP = 10;
const EDGE = 8;
/** Room the rotate handle needs on whichever side of the element it is drawn. */
const HANDLE = 34;

/**
 * Quick actions for the selected element, floating beside it.
 *
 * Anchored to the element rather than parked at the top of the stage, so it reads as
 * belonging to the thing it acts on. It follows the element's own box, which means it also
 * follows a drag or a resize — the geometry it reads is the same state the element renders
 * from, so the two can't disagree.
 *
 * It's an overlay on purpose: anything in the layout above the artboard changes the height
 * the artboard is scaled to fit, which is what used to shrink the slide on selection.
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

  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; top: number; below: boolean } | null>(null);

  const element = activeSlide?.elements.find((el) => el.id === selectedElementId);
  const visible = !!element && !!activeSlideId && canEdit;

  // Reads the element's rendered box rather than recomputing x*scale, so rotation and the
  // artboard's own offset come along for free.
  useLayoutEffect(() => {
    if (!visible || !selectedElementId) {
      setAt(null);
      return;
    }
    const stage = ref.current?.offsetParent as HTMLElement | null;
    const node = stage?.querySelector<HTMLElement>(`[data-el-id="${CSS.escape(selectedElementId)}"]`);
    if (!stage || !node) return;

    const box = node.getBoundingClientRect();
    const frame = stage.getBoundingClientRect();
    const bar = ref.current?.getBoundingClientRect();
    const width = bar?.width ?? 180;
    const height = bar?.height ?? 34;

    // Sit opposite the rotate handle. The handle is drawn above the element unless the
    // element is near the top of the slide, in which case it flips below — so rather than
    // repeating that rule, ask which side it actually ended up on.
    const handleBelow = !!node.querySelector('.rotate-handle.is-below');
    const above = box.top - frame.top - height - GAP - (handleBelow ? 0 : HANDLE);
    const below = box.bottom - frame.top + GAP + (handleBelow ? HANDLE : 0);

    const preferAbove = handleBelow;
    let top = preferAbove ? above : below;
    // Fall back to the other side, then clamp — a toolbar half off the stage is worse
    // than one that overlaps the handle it was avoiding.
    if (preferAbove ? top < EDGE : top + height > frame.height - EDGE) {
      top = preferAbove ? below : above;
    }
    top = Math.min(Math.max(top, EDGE), Math.max(frame.height - height - EDGE, EDGE));

    const centred = box.left - frame.left + box.width / 2 - width / 2;
    const left = Math.min(Math.max(centred, EDGE), Math.max(frame.width - width - EDGE, EDGE));

    setAt({ left, top, below: !preferAbove });
  }, [
    visible,
    selectedElementId,
    // Re-place when the element moves, resizes or rotates.
    element?.x,
    element?.y,
    element?.width,
    element?.height,
    element?.rotation,
    activeSlideId,
  ]);

  if (!visible || !element || !activeSlideId) return null;

  const imageUrl = element.type === 'image' ? getImageById(element.imageId)?.url : undefined;

  return (
    <div
      ref={ref}
      className="element-toolbar"
      style={at ? { left: at.left, top: at.top } : { opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {element.type === 'shape' && (
        <>
          <ShapeFormatControls element={element} slideId={activeSlideId} />
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
        <BringToFront size={14} strokeWidth={1.7} />
      </button>
      <button
        type="button"
        className="text-format-btn"
        onClick={() => sendToBack(activeSlideId, element.id)}
        data-tooltip="Send to back"
        aria-label="Send to back"
      >
        <SendToBack size={14} strokeWidth={1.7} />
      </button>

      {imageUrl && (
        <button
          type="button"
          className="text-format-btn"
          onClick={() => void downloadImage(imageUrl, imageFilename(imageUrl, activeSectionName))}
          data-tooltip="Download image"
          aria-label="Download image"
        >
          <Download size={14} strokeWidth={1.7} />
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
        <Trash2 size={14} strokeWidth={1.7} />
      </button>
    </div>
  );
}
