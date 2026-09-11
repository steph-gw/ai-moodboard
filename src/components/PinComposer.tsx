import { useEffect, useRef, useState } from 'react';
import { useBoard } from '../context/BoardContext';
import type { CommentPin } from '../types';

/**
 * The composer for a pin that has just been dropped.
 *
 * Placing a pin and then being sent to a drawer on the far side of the window to type the
 * thing you placed it for puts the writing a long way from the place it is about. This
 * opens where the pin is, takes the first comment, and gets out of the way. Everything
 * after that — replies, resolving, reading other slides' threads — is the drawer's job.
 */
/** Composer box, unscaled — it sits above the artboard, not inside its coordinate space. */
const WIDTH = 250;
const HEIGHT = 86;
/** Clearance from the pin, and from the artboard edge. */
const GAP = 14;

export function PinComposer({
  pin,
  scale,
  boardWidth,
  boardHeight,
}: {
  pin: CommentPin;
  scale: number;
  boardWidth: number;
  boardHeight: number;
}) {
  const { addComment, selectCommentPin, role } = useBoard();
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  // A pin near the right or bottom edge would push the box off the artboard, where it is
  // clipped. Flip it to the other side of the pin rather than let that happen, and clamp
  // so a pin in a corner still lands somewhere readable.
  const px = pin.x * scale;
  const py = pin.y * scale;
  const flipX = px + GAP + WIDTH > boardWidth;
  const flipY = py + GAP + HEIGHT > boardHeight;
  const left = Math.max(0, Math.min(flipX ? px - GAP - WIDTH : px + GAP, boardWidth - WIDTH));
  const top = Math.max(0, Math.min(flipY ? py - GAP - HEIGHT : py + GAP, boardHeight - HEIGHT));

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    addComment(pin.id, body);
    setDraft('');
    // The pin stays selected: the thread it just became is what the drawer should show.
  };

  return (
    <div
      className="pin-composer thread-reply"
      style={{ left, top, width: WIDTH }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Literally the drawer's reply box — same class, same behaviour. Two inputs that
          do the same job should not look like two different things. */}
      <textarea
        ref={ref}
        className="thread-reply-input"
        rows={2}
        placeholder={role === 'client' ? 'Leave a comment…' : 'Add a comment…'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') selectCommentPin(null);
        }}
      />
      {/* Same affordance as the drawer's reply box — Enter sends, and nothing else is
          needed. A button here was a second way to do the one thing this box does. */}
      <span className="thread-reply-hint" aria-hidden>
        <kbd>↵</kbd> to send
      </span>
    </div>
  );
}
