import { useRef } from 'react';
import { useBoard } from '../context/BoardContext';
import type { CommentPin } from '../types';
import { isPinResolved } from '../utils/commentHelpers';

interface CommentPinMarkerProps {
  pin: CommentPin;
  pinIndex: number;
  scale: number;
  /** Present mode and the export sheet: show the pin, never move it. */
  readOnly?: boolean;
}

/** Screen px before a press counts as a drag rather than a click on the pin. */
const DRAG_SLOP = 3;

export function CommentPinMarker({ pin, pinIndex, scale, readOnly }: CommentPinMarkerProps) {
  const { selectedCommentPinId, selectCommentPin, moveCommentPin } = useBoard();
  const isSelected = selectedCommentPinId === pin.id;
  const drag = useRef<{ id: number; startX: number; startY: number; moved: boolean } | null>(null);

  // A resolved thread is a finished conversation. Leaving its pin on the slide keeps
  // clutter on the artboard for something nobody needs to look at again; the thread is
  // still in the drawer under Resolved, and reopening puts the pin back.
  if (isPinResolved(pin)) return null;

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (readOnly) return;
    drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_SLOP) return;
    d.moved = true;
    // The pin is positioned against the scaled artboard, so screen movement has to come
    // back out of the scale before it means anything in board coordinates.
    moveCommentPin(pin.id, pin.x + (e.clientX - d.startX) / scale, pin.y + (e.clientY - d.startY) / scale);
    d.startX = e.clientX;
    d.startY = e.clientY;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    // A drag that ends is not also a click: only a press that stayed put selects.
    if (!d.moved) selectCommentPin(isSelected ? null : pin.id);
  };

  return (
    <button
      type="button"
      className={`comment-pin ${isSelected ? 'selected' : ''} ${readOnly ? '' : 'is-draggable'}`}
      style={{ left: pin.x * scale, top: pin.y * scale }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      aria-label={`Comment pin ${pinIndex}`}
      aria-pressed={isSelected}
    >
      <span className="comment-pin-num">{pinIndex}</span>
    </button>
  );
}
