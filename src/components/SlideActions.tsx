import { Copy, Lock, Plus, Unlock } from 'lucide-react';
import { useBoard } from '../context/BoardContext';

/**
 * Per-slide actions: a column down the right of the stage, starting at the top.
 *
 * Overlaid rather than placed in the header on purpose. Anything that takes layout space
 * above the artboard changes the height the artboard is scaled to fit, so a bar that came
 * and went would resize the slide under the cursor.
 */
export function SlideActions() {
  const {
    activeSlideId,
    lockedSlideIds,
    toggleSlideLock,
    duplicateSlide,
    addSlide,
    canManage,
    canEdit,
    canWrite,
  } = useBoard();

  if (!canWrite || !activeSlideId) return null;
  const locked = lockedSlideIds.has(activeSlideId);

  return (
    <div className="slide-actions">
      {/* Locking is governance: a client never sees the control, so the freeze it causes
          is never theirs to lift. */}
      {canManage && (
        <button
          type="button"
          className={`slide-action-btn ${locked ? 'is-locked' : ''}`}
          onClick={() => toggleSlideLock(activeSlideId)}
          data-tooltip={locked ? 'Unlock slide' : 'Lock slide'}
          aria-label={locked ? 'Unlock slide' : 'Lock slide'}
          aria-pressed={locked}
        >
          {locked ? <Lock size={14} strokeWidth={1.7} /> : <Unlock size={14} strokeWidth={1.7} />}
        </button>
      )}
      {/* Both of these add to the section, so a frozen one refuses them. */}
      {canEdit && (
        <>
          <button
            type="button"
            className="slide-action-btn"
            onClick={() => void duplicateSlide(activeSlideId)}
            data-tooltip="Duplicate slide"
            aria-label="Duplicate slide"
          >
            <Copy size={14} strokeWidth={1.7} />
          </button>
          <button
            type="button"
            className="slide-action-btn"
            onClick={() => void addSlide()}
            data-tooltip="Add slide"
            aria-label="Add slide"
          >
            <Plus size={14} strokeWidth={1.7} />
          </button>
        </>
      )}
    </div>
  );
}
