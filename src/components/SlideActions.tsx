import { Copy, Lock, Plus, Unlock } from 'lucide-react';
import { useBoard } from '../context/BoardContext';

/**
 * Per-slide actions, floating over the top-right of the stage.
 *
 * Overlaid rather than placed in the header on purpose: anything that takes layout space
 * above the artboard changes its height, and the artboard is scaled to fit — so a bar that
 * appears and disappears would resize the slide under the cursor.
 */
export function SlideActions() {
  const {
    activeSlideId,
    lockedSlideIds,
    toggleSlideLock,
    duplicateSlide,
    addSlide,
    canManage,
  } = useBoard();

  if (!canManage || !activeSlideId) return null;
  const locked = lockedSlideIds.has(activeSlideId);

  return (
    <div className="slide-actions">
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
    </div>
  );
}
