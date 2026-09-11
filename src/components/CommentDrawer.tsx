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
  const { deleteComment, reopenComment } = useBoard();
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
          {canReopen && (
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
  const { currentUserId, resolveComment, editComment } = useBoard();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const isOwn = comment.authorId === currentUserId;
  // Reopening is offered on the comment that closed the thread.
  const canReopen = isFirst && !!comment.resolved;

  const saveEdit = () => {
    editComment(pinId, comment.id, draft);
    setEditing(false);
  };

  return (
    <div
      className={`thread-item ${isReply ? 'is-reply' : ''} ${comment.resolved ? 'is-resolved' : ''}`}
    >
      <div className="thread-item-head">
        <span
          className="thread-avatar"
          style={{ backgroundColor: avatarColor(comment.authorId) }}
          aria-hidden
        >
          {comment.authorInitials}
        </span>
        <span className="thread-author">{comment.authorName}</span>
        <span className="thread-time">
          {formatTimestamp(comment.timestamp)}
          {comment.edited && ' · edited'}
        </span>
        <div className="thread-item-actions">
          {/* Resolve lives on the opening comment only — it closes the thread. */}
          {isFirst && !comment.resolved && (
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
          {(isOwn || canReopen) && (
            <CommentActions
              pinId={pinId}
              comment={comment}
              canEdit={isOwn}
              canReopen={canReopen}
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

function Thread({
  pin,
  pinIndex,
  isSelected,
}: {
  pin: CommentPin;
  pinIndex: number;
  isSelected: boolean;
}) {
  const { addComment, selectCommentPin, role } = useBoard();
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
      onClick={() => !isSelected && selectCommentPin(pin.id)}
    >
      <span className="thread-pin-badge">Pin {pinIndex}</span>
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
  const { selectedCommentPinId, activeSlide, isCommentsOpen, setCommentsOpen } =
    useBoard();
  const [filter, setFilter] = useState<ThreadFilter>('all');

  if (!isCommentsOpen || !activeSlide) return null;

  const pins = activeSlide.commentPins;
  const numbered = pins.map((pin, index) => ({ pin, index: index + 1 }));
  const open = numbered.filter(({ pin }) => !isPinResolved(pin));
  const resolved = numbered.filter(({ pin }) => isPinResolved(pin));

  const showOpen = filter !== 'resolved';
  const showResolved = filter !== 'open' && resolved.length > 0;
  const nothingToShow =
    (!showOpen || open.length === 0) && (!showResolved || resolved.length === 0);

  const renderThread = ({ pin, index }: { pin: CommentPin; index: number }) => (
    <Thread
      key={pin.id}
      pin={pin}
      pinIndex={index}
      isSelected={pin.id === selectedCommentPinId}
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
