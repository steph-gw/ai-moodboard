import { Sparkles, Presentation, Download, MessageSquare } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { requestFullscreen } from '../utils/fullscreen';
import { formatEventDate } from '../utils/formatDate';
import { useHost } from '../embed/HostProvider';
import { TemplateMenu } from './TemplateMenu';

export function TopNav() {
  const {
    board,
    role,
    summarizeVision,
    isSummarizing,
    setPresenting,
    isCommentsOpen,
    setCommentsOpen,
  } = useBoard();
  const { features, logoUrl } = useHost();
  const { isDirty, saveState, saveNow, exportPdf, isExporting } = useBoard();
  const isPlanner = role === 'planner';

  return (
    <header className="topnav">
      <div className="topnav-left">
        {/* No logo configured is a normal state — the host may simply not have set one —
            and an <img> with an empty src renders as a broken-image icon, which reads as
            a bug. Fall back to the wordmark as text. */}
        {logoUrl ? (
          <img className="topnav-logo" src={logoUrl} alt="GatherWise" />
        ) : (
          <span className="topnav-wordmark">GatherWise</span>
        )}
        <span className="topnav-sep">/</span>
        <span className="topnav-event">{board.weddingName}</span>
        <span className="topnav-date">{formatEventDate(board.weddingDate)}</span>
      </div>
      <div className="topnav-right">
        <SaveStatus isDirty={isDirty} state={saveState} onSave={saveNow} />
        <div className="viewer-stack">
          {board.viewers.map((v) =>
            v.photoUrl ? (
              // The tooltip lives on the wrapper, not the image: ::before/::after never
              // render on a replaced element, so a data-tooltip on the <img> was silently
              // doing nothing.
              <span key={v.id} className="viewer-avatar is-photo" data-tooltip={v.name}>
                <img src={v.photoUrl} alt={v.name} />
              </span>
            ) : (
              <div key={v.id} className="viewer-avatar" data-tooltip={v.name}>
                {v.initials}
              </div>
            )
          )}
        </div>
        <button
          type="button"
          className={`btn-ghost btn-sm btn-icon ${isCommentsOpen ? 'active' : ''}`}
          onClick={() => setCommentsOpen(!isCommentsOpen)}
          data-tooltip="Show all comments"
          aria-label="Show all comments"
          aria-pressed={isCommentsOpen}
        >
          <MessageSquare size={13} strokeWidth={1.5} />
        </button>
        {/* Board-level, so it lives up here rather than in the section bar — which does
            not render at all on an empty board, which is exactly when someone wants to
            start from a template. Sits with Present and Export, the other board actions. */}
        <TemplateMenu />
        {isPlanner && features.present && (
          <>
            <button
              type="button"
              className="btn-ghost btn-sm"
              data-tooltip="Present"
              onClick={() => {
                // Requested from the click itself so the user gesture is still valid.
                void requestFullscreen();
                setPresenting(true);
              }}
            >
              <Presentation size={13} strokeWidth={1.5} />
              <span className="btn-label">Present</span>
            </button>
          </>
        )}
        {isPlanner && features.exportPdf && (
          <button
            type="button"
            className="btn-ghost btn-sm"
            data-tooltip="Export PDF"
            onClick={() => void exportPdf()}
            disabled={isExporting}
          >
            <Download size={13} strokeWidth={1.5} />
            <span className="btn-label">{isExporting ? 'Preparing…' : 'Export PDF'}</span>
          </button>
        )}
        {features.summarizeVision && (
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={summarizeVision}
            disabled={isSummarizing}
          >
            <Sparkles size={13} strokeWidth={1.5} />
            {isSummarizing ? 'Summarizing…' : 'Summarize vision'}
          </button>
        )}
      </div>
    </header>
  );
}

/**
 * The board saves on idle and on navigation rather than on every edit, which keeps Bubble
 * writes down — so it has to say so, or "I moved something 20 seconds ago" feels unsaved.
 */
function SaveStatus({
  isDirty,
  state,
  onSave,
}: {
  isDirty: boolean;
  state: 'idle' | 'saving' | 'error' | 'conflict';
  onSave: () => Promise<void>;
}) {
  if (state === 'saving') return <span className="save-status">Saving…</span>;
  if (state === 'error') {
    return (
      <button type="button" className="save-status is-error" onClick={() => void onSave()}>
        Save failed — retry
      </button>
    );
  }
  if (isDirty) {
    return (
      <>
        <span className="save-status is-dirty">Unsaved changes</span>
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => void onSave()}
          data-tooltip="⌘S"
        >
          Save changes
        </button>
      </>
    );
  }
  return <span className="save-status">Saved</span>;
}
