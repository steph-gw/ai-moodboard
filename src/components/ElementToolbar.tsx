import { useLayoutEffect, useRef, useState } from 'react';
import { BringToFront, Download, Lock, SendToBack, Trash2 } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { downloadImage, imageFilename } from '../utils/downloadImage';
import { ShapeFormatControls } from './ShapeFormatControls';
import { ColorField } from './ColorField';

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
    selectedElementIds,
    canEdit,
    bringToFront,
    sendToBack,
    deleteSelection,
    canDeleteElement,
    ungroupElement,
    updateElement,
    getImageById,
    activeSectionName,
  } = useBoard();

  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; top: number; below: boolean } | null>(null);

  const selected = (activeSlide?.elements ?? []).filter((el) => selectedElementIds.includes(el.id));
  // The last one picked: what the toolbar anchors to, and what its single-element
  // controls read their current values from.
  const element = selected.length ? selected[selected.length - 1] : undefined;
  const many = selected.length > 1;
  // Format controls need every member to be the same kind of thing — there is no sensible
  // corner radius for a mixture of a rectangle and a photograph.
  const sameType = !!element && selected.every((el) => el.type === element.type);
  // A client may delete only what they added, so the button appears only when something in
  // the selection actually is theirs — and counts just that part.
  const deletable = selected.filter(canDeleteElement);
  const visible = !!element && !!activeSlideId && canEdit;

  // Reads the element's rendered box rather than recomputing x*scale, so rotation and the
  // artboard's own offset come along for free.
  const anchorId = element?.id ?? null;
  useLayoutEffect(() => {
    if (!visible || !anchorId) {
      setAt(null);
      return;
    }
    const stage = ref.current?.offsetParent as HTMLElement | null;
    const node = stage?.querySelector<HTMLElement>(`[data-el-id="${CSS.escape(anchorId)}"]`);
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
    anchorId,
    selected.length,
    // Re-place when the element moves, resizes or rotates.
    element?.x,
    element?.y,
    element?.width,
    element?.height,
    element?.rotation,
    activeSlideId,
  ]);

  if (!visible || !element || !activeSlideId) return null;

  // Downloading is a one-file action; offering it for a group would need a zip.
  const imageUrl =
    !many && element.type === 'image' ? getImageById(element.imageId)?.url : undefined;

  return (
    <div
      ref={ref}
      className="element-toolbar"
      style={at ? { left: at.left, top: at.top } : { opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {many && (
        <>
          <span className="toolbar-count">{selected.length} selected</span>
          <span className="text-format-divider" />
        </>
      )}

      {/* A placed palette is one object. The padlock says so, and opening it is the only
          way to get at the colors and labels separately — which is why it is a labelled
          button rather than an icon someone has to discover. */}
      {!many && element.type === 'paletteGroup' && (
        <>
          <button
            type="button"
            className="text-format-btn is-grouped"
            onClick={() => ungroupElement(element.id)}
            data-tooltip="Unlock to edit the colors separately"
            aria-label="Unlock palette"
          >
            <Lock size={13} strokeWidth={1.9} />
            Locked
          </button>
          <span className="text-format-divider" />
        </>
      )}

      {/* A loose chip's color, changed on the slide. It overrides this one placement only:
          the palette is a set of colors someone saved, and a swatch is a copy of one, so
          repainting a copy must not reach back and edit the original. */}
      {element.type === 'swatch' && sameType && (
        <>
          <ColorField
            label="Swatch color"
            value={element.color}
            onChange={(color) =>
              selected.forEach((el) => updateElement(activeSlideId, el.id, { color }))
            }
          />
          <span className="text-format-divider" />
        </>
      )}

      {element.type === 'shape' && sameType && (
        <>
          <ShapeFormatControls
            element={element}
            slideId={activeSlideId}
            applyToIds={selected.map((el) => el.id)}
          />
          <span className="text-format-divider" />
        </>
      )}


      <button
        type="button"
        className="text-format-btn"
        onClick={() => selected.forEach((el) => bringToFront(activeSlideId, el.id))}
        data-tooltip="Bring to front"
        aria-label="Bring to front"
      >
        <BringToFront size={14} strokeWidth={1.7} />
      </button>
      <button
        type="button"
        className="text-format-btn"
        onClick={() => [...selected].reverse().forEach((el) => sendToBack(activeSlideId, el.id))}
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

      {deletable.length > 0 && (
        <>
          <span className="text-format-divider" />

          <button
            type="button"
            className="text-format-btn is-danger"
            onClick={deleteSelection}
            data-tooltip={deletable.length > 1 ? `Delete ${deletable.length}` : 'Delete'}
            aria-label={
              deletable.length > 1 ? `Delete ${deletable.length} elements` : 'Delete'
            }
          >
            <Trash2 size={14} strokeWidth={1.7} />
          </button>
        </>
      )}
    </div>
  );
}
