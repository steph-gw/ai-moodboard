import { Copy, Lock, Plus, Unlock } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { formatApprovalDate } from '../utils/formatDate';

/**
 * Per-slide actions: a column down the right of the stage, starting at the top.
 *
 * Overlaid rather than placed in the header on purpose. Anything that takes layout space
 * above the artboard changes the height the artboard is scaled to fit, so a bar that came
 * and went would resize the slide under the cursor.
 *
 * This padlock is the *only* lock badge on the stage. There used to be a second one in the
 * top-left corner saying the same thing in a different place, which read as two separate
 * facts about the slide rather than one.
 */
export function SlideActions() {
  const {
    activeSlideId,
    lockedSlideIds,
    unlockedSlideIds,
    toggleSlideLock,
    duplicateSlide,
    addSlide,
    canManage,
    canEdit,
    canWrite,
    board,
    activeSectionId,
  } = useBoard();

  if (!activeSlideId) return null;

  const section = board.sections.find((s) => s.id === activeSectionId);
  const approved = section?.status === 'approved';
  const opened = unlockedSlideIds.has(activeSlideId);
  const locked = (lockedSlideIds.has(activeSlideId) || approved) && !opened;

  // A viewer with no write access has nothing to do here, but they still need to be told
  // why the slide won't take an edit — so the padlock stays and the rest goes.
  if (!canWrite && !locked) return null;

  const on = formatApprovalDate(section?.approvedDate ?? '');
  const why = approved
    ? `This slide has been approved${on ? ` on ${on}` : ''}.`
    : 'This slide is locked.';
  const tooltip = locked
    ? canManage
      ? `${why} Click to unlock to edit.`
      : why
    : approved
      ? `Unlocked for editing — still approved${on ? ` on ${on}` : ''}. Click to lock again.`
      : 'Lock slide';

  return (
    <div className="slide-actions">
      {/* Locking is governance: a client never gets the toggle, so the freeze it causes is
          never theirs to lift. They do get the badge — it is the answer to "why can't I
          move this?" — so it renders either way and only the button-ness changes.

          Unlocking an approved section does not un-approve it. Approval is a record of a
          decision; the padlock is a working state on top of it. Re-approving, or a reload,
          puts the freeze back. */}
      {(canManage || locked) && (
        <button
          type="button"
          className={`slide-action-btn ${locked ? 'is-locked' : ''} ${canManage ? '' : 'is-static'}`}
          onClick={() => canManage && toggleSlideLock(activeSlideId)}
          data-tooltip={tooltip}
          aria-label={locked ? 'Unlock slide' : 'Lock slide'}
          aria-pressed={locked}
          aria-disabled={!canManage}
        >
          {locked ? <Lock size={14} strokeWidth={1.7} /> : <Unlock size={14} strokeWidth={1.7} />}
        </button>
      )}
      {/* Both of these add to the section, so a frozen one refuses them. */}
      {canWrite && canEdit && (
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
