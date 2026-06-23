import { useBoard } from '../context/BoardContext';
import { countPinComments } from '../utils/commentHelpers';

export function CommentWidget() {
  const {
    activeSlide,
    isPlacingComment,
    setPlacingComment,
    isPresenting,
  } = useBoard();

  if (isPresenting || !activeSlide) return null;

  const totalComments = activeSlide.commentPins.reduce(
    (sum, pin) => sum + countPinComments(pin),
    0
  );

  const summary =
    totalComments === 0
      ? `${activeSlide.name} · No comments yet`
      : `${activeSlide.name} · ${totalComments} comment${totalComments !== 1 ? 's' : ''} on this slide`;

  return (
    <div className="comment-widget">
      {isPlacingComment ? (
        <>
          <span className="comment-widget-label">
            Click anywhere to pin a comment
          </span>
          <span className="comment-widget-divider" />
          <button
            type="button"
            className="comment-widget-cancel"
            onClick={() => setPlacingComment(false)}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="comment-widget-label">{summary}</span>
          <span className="comment-widget-divider" />
          <button
            type="button"
            className="comment-widget-add"
            onClick={() => setPlacingComment(true)}
          >
            Add comment
          </button>
        </>
      )}
    </div>
  );
}
