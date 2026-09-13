import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import type { Comment, CommentPin } from '../types';
import { avatarColor } from '../utils/avatarColor';
import { isPinResolved } from '../utils/commentHelpers';
import { formatTimestamp } from '../utils/formatTime';

type ThreadFilter = 'all' | 'open' | 'resolved';

function CommentActions({
  pinId,
  comment,
  canEdit,
  canReopen,
  onStartEdit,
}: {
  pinId: string;
  comment: Comment;
  canEdit: boolean;
  canReopen: boolean;
  onStartEdit: () => void;
}) {
  const { deleteComment, reopenComment, isAdmin } = useBoard();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div className="thread-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="thread-icon-btn"
        aria-label="Comment options"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={14} strokeWidth={1.7} />
      </button>
      {open && (
        <div className="thread-menu" role="menu">
          {canReopen && isAdmin && (
            <button
              type="button"
              className="thread-menu-item"
              onClick={() => {
                setOpen(false);
                reopenComment(pinId);
              }}
            >
              <RotateCcw size={13} strokeWidth={1.6} />
              Reopen
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              className="thread-menu-item"
              onClick={() => {
                setOpen(false);
                onStartEdit();
              }}
            >
              <Pencil size={13} strokeWidth={1.6} />
              Edit
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              className="thread-menu-item is-danger"
              onClick={() => {
                setOpen(false);
                deleteComment(pinId, comment.id);
              }}
            >
              <Trash2 size={13} strokeWidth={1.6} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CommentRow({
  pinId,
  comment,
  isReply = false,
  isFirst = false,
}: {
  pinId: string;
  comment: Comment;
  isReply?: boolean;
  isFirst?: boolean;
}) {
  const { currentUserId, isAdmin, resolveComment, reopenComment, editComment } = useBoard();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const isOwn = comment.authorId === currentUserId;
  // Reopening is offered on the comment that closed the thread.
  // Closing a conversation is a decision about it, not a contribution to it: anyone may
  // comment and reply, an admin decides when a thread is finished.
  const canReopen = isAdmin && isFirst && !!comment.resolved;

  const saveEdit = () => {
    editComment(pinId, comment.id, draft);
    setEditing(false);
  };

  return (
    <div
      className={`thread-item ${isReply ? 'is-reply' : ''} ${comment.resolved ? 'is-resolved' : ''}`}
    >
      <div className="thread-item-head">
        {/* A photo when the host knows one, initials otherwise — a comment from someone
            no longer on the event still has to render. */}
        {comment.authorPhotoUrl ? (
          <span className="thread-avatar is-photo" aria-hidden>
            <img src={comment.authorPhotoUrl} alt="" />
          </span>
        ) : (
          <span
            className="thread-avatar"
            style={{ backgroundColor: avatarColor(comment.authorId) }}
            aria-hidden
          >
            {comment.authorInitials}
          </span>
        )}
        <span className="thread-author">{comment.authorName}</span>
        <span className="thread-time">
          {formatTimestamp(comment.timestamp)}
          {comment.edited && ' · edited'}
        </span>
        <div className="thread-item-actions">
          {/* Resolve lives on the opening comment only — it closes the thread. */}
          {isAdmin && isFirst && !comment.resolved && (
            <button
              type="button"
              className="thread-icon-btn"
              data-tooltip="Resolve thread"
              aria-label="Mark as resolved"
              onClick={() => resolveComment(pinId)}
            >
              <CheckCircle2 size={15} strokeWidth={1.6} />
            </button>
          )}
          {/* A resolved thread offers exactly one thing: reopening it. Edit and delete
              belong to a live conversation, so the menu goes away with the thread. */}
          {/* Reopen rides on the comment's own row, next to the time, rather than on a
              header of its own — that header was a line of gap above every resolved
              thread for one button. */}
          {canReopen && (
            <button
              type="button"
              className="thread-reopen-btn"
              onClick={(e) => {
                e.stopPropagation();
                reopenComment(pinId);
              }}
            >
              <RotateCcw size={11} strokeWidth={1.7} />
              Reopen
            </button>
          )}
          {isOwn && !comment.resolved && (
            <CommentActions
              pinId={pinId}
              comment={comment}
              canEdit={isOwn}
              canReopen={false}
              onStartEdit={() => {
                setDraft(comment.text);
                setEditing(true);
              }}
            />
          )}
        </div>
      </div>

      {editing ? (
        <div className="thread-edit">
          <textarea
            className="thread-reply-input"
            value={draft}
            rows={2}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
              }
              if (e.key === 'Escape') setEditing(false);
            }}
          />
          <div className="thread-edit-actions">
            <button
              type="button"
              className="thread-edit-cancel"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button type="button" className="thread-edit-save" onClick={saveEdit}>
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="thread-text">{comment.text}</p>
      )}

      {comment.resolved && (
        <p className="thread-resolved-note">Resolved by {comment.resolvedBy}</p>
      )}
      {comment.replies?.map((reply) => (
        <CommentRow key={reply.id} pinId={pinId} comment={reply} isReply />
      ))}
    </div>
  );
}

interface ThreadEntry {
  pin: CommentPin;
  sectionId: string;
  slideId: string;
}

function Thread({
  pin,
  isSelected,
  sectionId,
  slideId,
  isElsewhere,
}: {
  pin: CommentPin;
  isSelected: boolean;
  sectionId: string;
  slideId: string;
  /** The thread lives on a slide other than the one on screen. */
  isElsewhere: boolean;
}) {
  const { addComment, selectCommentPin, goToPin, role } = useBoard();
  const [draft, setDraft] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected) {
      cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isSelected]);

  const resolved = isPinResolved(pin);
  const hasComments = pin.comments.length > 0;
  const placeholder = hasComments
    ? 'Reply…'
    : role === 'client'
      ? 'Leave a comment…'
      : 'Add a comment…';

  const handleSubmit = () => {
    if (!draft.trim()) return;
    addComment(pin.id, draft.trim());
    setDraft('');
  };

  return (
    <div
      ref={cardRef}
      className={`thread-card ${isSelected ? 'is-selected' : ''} ${resolved ? 'is-resolved' : ''}`}
      onClick={() => {
        if (isSelected) return;
        // Selecting a thread that lives elsewhere takes you to it — otherwise the drawer
        // would be showing a conversation about a slide you cannot see.
        if (isElsewhere) goToPin(sectionId, slideId, pin.id);
        else selectCommentPin(pin.id);
      }}
    >

      {hasComments ? (
        pin.comments.map((comment, i) => (
          <CommentRow
            key={comment.id}
            pinId={pin.id}
            comment={comment}
            isFirst={i === 0}
          />
        ))
      ) : (
        <p className="thread-empty">No comments on this pin yet.</p>
      )}

      {/* Every open thread keeps its reply box. Making it appear only on the selected
          thread meant replying was a two-click job, and the drawer jumped as the box
          moved between cards. */}
      {!resolved && (
        <div className="thread-reply">
          <textarea
            className="thread-reply-input"
            placeholder={placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <span className="thread-reply-hint" aria-hidden>
            <kbd>↵</kbd> to send
          </span>
        </div>
      )}
    </div>
  );
}

export function CommentDrawer() {
  const {
    selectedCommentPinId,
    board,
    activeSlideId,
    isCommentsOpen,
    setCommentsOpen,
  } = useBoard();
  const [filter, setFilter] = useState<ThreadFilter>('all');

  if (!isCommentsOpen) return null;

  // Every thread on the board, not just this slide's. The drawer is how you find a
  // conversation you half-remember — which is no use if you have to already be standing
  // on the right slide. Each entry carries where it lives so selecting it can go there.
  const numbered = board.sections.flatMap((section) =>
    section.slides.flatMap((slide) =>
      slide.commentPins.map((pin) => ({
        pin,
        sectionId: section.id,
        slideId: slide.id,
      }))
    )
  );
  // Newest first: the thread you want is nearly always the one that just appeared.
  numbered.reverse();
  const pins = numbered;
  const open = numbered.filter(({ pin }) => !isPinResolved(pin));
  const resolved = numbered.filter(({ pin }) => isPinResolved(pin));

  const showOpen = filter !== 'resolved';
  const showResolved = filter !== 'open' && resolved.length > 0;
  const nothingToShow =
    (!showOpen || open.length === 0) && (!showResolved || resolved.length === 0);

  const renderThread = (entry: ThreadEntry) => (
    <Thread
      key={entry.pin.id}
      pin={entry.pin}
      isSelected={entry.pin.id === selectedCommentPinId}
      sectionId={entry.sectionId}
      slideId={entry.slideId}
      isElsewhere={entry.slideId !== activeSlideId}
    />
  );

  return (
    <aside className="comment-drawer" aria-label="Comments">
      <div className="comment-drawer-head">
        <h2 className="comment-drawer-title">Comments</h2>
        <button
          type="button"
          className="comment-drawer-close"
          onClick={() => setCommentsOpen(false)}
          aria-label="Close comments"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      {pins.length > 1 && (
        <div className="comment-drawer-filter">
          <select
            className="comment-filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value as ThreadFilter)}
            aria-label="Filter threads"
          >
            <option value="all">All threads ({pins.length})</option>
            <option value="open">Open ({open.length})</option>
            <option value="resolved">Resolved ({resolved.length})</option>
          </select>
        </div>
      )}

      <div className={`comment-drawer-body ${pins.length === 0 ? 'is-empty' : ''}`}>
        {pins.length === 0 ? (
          <div className="drawer-empty">
            <MessageSquarePlus size={26} strokeWidth={1.3} aria-hidden />
            <p className="drawer-empty-title">No comments yet</p>
            <p className="drawer-empty-hint">
              Choose <strong>Add comment</strong> at the bottom of the slide, then click
              where to add the comment
            </p>
          </div>
        ) : nothingToShow ? (
          <p className="thread-empty">No threads to show.</p>
        ) : (
          <>
            {showOpen && open.map(renderThread)}
            {/* The Resolved group only exists once something has been resolved, and only
                carries a rule above it when there is something above it to divide from. */}
            {showResolved && (
              <>
                <h3
                  className={`thread-group-label ${
                    showOpen && open.length > 0 ? '' : 'is-first'
                  }`}
                >
                  Resolved
                </h3>
                {resolved.map(renderThread)}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
