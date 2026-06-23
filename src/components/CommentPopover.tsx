import { useState } from 'react';
import { useBoard } from '../context/BoardContext';
import type { Comment } from '../types';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../types';
import { avatarColor } from '../utils/avatarColor';

interface CommentPopoverProps {
  scale: number;
  pinIndex: number;
}

function CommentRow({
  comment,
  isReply = false,
}: {
  comment: Comment;
  isReply?: boolean;
}) {
  return (
    <div className={`comment-popover-item ${isReply ? 'is-reply' : ''} ${comment.resolved ? 'is-resolved' : ''}`}>
      <div className="comment-popover-item-head">
        <span
          className="comment-popover-avatar"
          style={{ backgroundColor: avatarColor(comment.authorId) }}
          aria-hidden
        >
          {comment.authorInitials}
        </span>
        <span className="comment-popover-author">{comment.authorName}</span>
        <span className="comment-popover-time">{comment.timestamp}</span>
      </div>
      <p className="comment-popover-text">{comment.text}</p>
      {comment.resolved && (
        <p className="comment-popover-resolved-note">
          Resolved by {comment.resolvedBy}
        </p>
      )}
      {comment.replies?.map((reply) => (
        <CommentRow key={reply.id} comment={reply} isReply />
      ))}
    </div>
  );
}

export function CommentPopover({ scale, pinIndex }: CommentPopoverProps) {
  const {
    selectedCommentPin,
    selectedCommentPinId,
    activeSectionName,
    activeSectionId,
    activeSlide,
    selectCommentPin,
    addComment,
    resolveComment,
    role,
  } = useBoard();
  const [draft, setDraft] = useState('');

  if (!selectedCommentPin || !selectedCommentPinId || !activeSlide) return null;

  const artboardWidth = SLIDE_WIDTH * scale;
  const popoverWidth = 340;
  const pinX = selectedCommentPin.x * scale;
  const pinY = selectedCommentPin.y * scale;

  let left = pinX + 20;
  if (left + popoverWidth > artboardWidth - 8) {
    left = Math.max(8, pinX - popoverWidth - 20);
  }

  let top = pinY - 24;
  if (top < 8) top = pinY + 20;
  if (top > SLIDE_HEIGHT * scale - 200) {
    top = Math.max(8, pinY - 220);
  }

  const path = `/${activeSectionId}/${activeSlide.name.toLowerCase().replace(/\s+/g, '-')}`;
  const hasComments = selectedCommentPin.comments.length > 0;
  const placeholder = hasComments ? 'Reply…' : role === 'client' ? 'Leave a comment…' : 'Add a comment…';
  const isPlanner = role === 'planner';
  const firstOpenComment = selectedCommentPin.comments.find((c) => !c.resolved);

  const handleSubmit = () => {
    if (!draft.trim()) return;
    addComment(selectedCommentPinId, draft.trim());
    setDraft('');
  };

  return (
    <div
      className="comment-popover"
      style={{ left, top, width: popoverWidth }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="comment-popover-header">
        <div className="comment-popover-context">
          <div className="comment-popover-eyebrow">
            <span className="comment-popover-dot" />
            Thread on
          </div>
          <div className="comment-popover-context-title">{activeSectionName}</div>
          <div className="comment-popover-path">{path}</div>
        </div>
        <div className="comment-popover-header-actions">
          {isPlanner && firstOpenComment && (
            <button
              type="button"
              className="comment-popover-resolve-btn"
              onClick={() => resolveComment(selectedCommentPinId, firstOpenComment.id)}
            >
              Resolve
            </button>
          )}
          <button
            type="button"
            className="comment-popover-close"
            onClick={() => selectCommentPin(null)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="comment-popover-body">
        {hasComments ? (
          selectedCommentPin.comments.map((comment) => (
            <CommentRow key={comment.id} comment={comment} />
          ))
        ) : (
          <p className="comment-popover-empty">
            Pin #{pinIndex} — add the first comment below.
          </p>
        )}

        <textarea
          className="comment-popover-reply"
          placeholder={placeholder}
          value={draft}
          rows={2}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
      </div>
    </div>
  );
}
