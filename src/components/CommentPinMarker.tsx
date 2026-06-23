import { useBoard } from '../context/BoardContext';
import type { CommentPin } from '../types';
import { isPinResolved } from '../utils/commentHelpers';

interface CommentPinMarkerProps {
  pin: CommentPin;
  pinIndex: number;
  scale: number;
}

export function CommentPinMarker({ pin, pinIndex, scale }: CommentPinMarkerProps) {
  const { selectedCommentPinId, selectCommentPin } = useBoard();
  const resolved = isPinResolved(pin);
  const isSelected = selectedCommentPinId === pin.id;

  return (
    <button
      type="button"
      className={`comment-pin ${resolved ? 'resolved' : ''} ${isSelected ? 'selected' : ''}`}
      style={{
        left: pin.x * scale,
        top: pin.y * scale,
      }}
      onClick={(e) => {
        e.stopPropagation();
        selectCommentPin(isSelected ? null : pin.id);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      aria-label={`Comment pin ${pinIndex}`}
      aria-pressed={isSelected}
    >
      <span className="comment-pin-num">{pinIndex}</span>
    </button>
  );
}
