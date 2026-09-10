import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NotebookPen, X } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { useHost } from '../embed/HostProvider';

/**
 * The vision brief, behind a button rather than always open above the canvas.
 *
 * It was a permanent four-line block between the section tabs and the artboard, and the
 * artboard is scaled to whatever height is left — so the brief was costing the slide real
 * size on every screen, to show text nobody re-reads after the first look.
 */
export function VisionBrief() {
  const { visionBrief, updateVisionBrief, canManage } = useBoard();
  const { portalHost } = useHost();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (r) setAt({ left: r.left, top: r.bottom + 6 });
    };
    place();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const commit = () => {
    if (canManage && ref.current) updateVisionBrief(ref.current.innerText);
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`btn-ghost btn-sm ${open ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        data-tooltip="Vision brief"
        aria-expanded={open}
      >
        <NotebookPen size={13} strokeWidth={1.5} />
        Brief
      </button>

      {open &&
        at &&
        createPortal(
          <>
            <div
              className="vision-brief-scrim"
              onPointerDown={() => {
                commit();
                setOpen(false);
              }}
            />
            <div className="vision-brief-pop" style={{ left: at.left, top: at.top }}>
              <div className="vision-brief-pop-head">
                <p className="vision-brief-label">Vision brief</p>
                <button
                  type="button"
                  className="vision-brief-close"
                  onClick={() => {
                    commit();
                    setOpen(false);
                  }}
                  aria-label="Close"
                >
                  <X size={13} strokeWidth={1.6} />
                </button>
              </div>
              {canManage ? (
                <p
                  ref={ref}
                  className="vision-brief-text vision-brief-editable"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={commit}
                >
                  {visionBrief}
                </p>
              ) : (
                <p className="vision-brief-text">{visionBrief}</p>
              )}
            </div>
          </>,
          portalHost
        )}
    </>
  );
}
