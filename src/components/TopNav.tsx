import { Sparkles, Presentation, Download } from 'lucide-react';
import { useBoard } from '../context/BoardContext';

export function TopNav() {
  const { board, role, summarizeVision, isSummarizing, setPresenting } = useBoard();
  const isPlanner = role === 'planner';

  return (
    <header className="topnav">
      <div className="topnav-left">
        <span className="topnav-wordmark">Gatherwise</span>
        <span className="topnav-sep">/</span>
        <span className="topnav-event">{board.weddingName}</span>
        <span className="topnav-date-pill">{board.weddingDate}</span>
      </div>
      <div className="topnav-right">
        <div className="viewer-stack">
          {board.viewers.map((v) => (
            <div key={v.id} className="viewer-avatar" title={v.name}>
              {v.initials}
            </div>
          ))}
        </div>
        {isPlanner && (
          <>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setPresenting(true)}
            >
              <Presentation size={13} strokeWidth={1.5} />
              Present
            </button>
            <button type="button" className="btn-ghost btn-sm">
              <Download size={13} strokeWidth={1.5} />
              Export
            </button>
          </>
        )}
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={summarizeVision}
          disabled={isSummarizing}
        >
          <Sparkles size={13} strokeWidth={1.5} />
          {isSummarizing ? 'Summarizing…' : 'Summarize vision'}
        </button>
      </div>
    </header>
  );
}
