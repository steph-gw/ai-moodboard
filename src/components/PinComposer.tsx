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
export function PinComposer({ pin, scale }: { pin: CommentPin; scale: number }) {
  const { addComment, selectCommentPin, role } = useBoard();
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

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
      className="pin-composer"
      style={{ left: pin.x * scale, top: pin.y * scale }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        ref={ref}
        className="pin-composer-input"
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
      <div className="pin-composer-actions">
        <span className="pin-composer-hint" aria-hidden>
          <kbd>↵</kbd> to send
        </span>
        <button type="button" className="pin-composer-send" onClick={submit} disabled={!draft.trim()}>
          Comment
        </button>
      </div>
    </div>
  );
}
