import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Palette, Plus, X } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { useHost } from '../embed/HostProvider';
import { DEFAULT_PALETTE } from '../types';

const MAX_COLORS = 12;
const NEW_COLOR = '#c4a35a';

/**
 * Edits the board's working colors.
 *
 * Lives beside the brief because it is the same kind of thing: a decision about the whole
 * moodboard rather than about the slide in front of you. Every color control on the
 * canvas — text, outline, fill, background — offers this list, so it is the one place that
 * decides what a board's colors are.
 *
 * One list per board, not several. A second palette would need somewhere to live in the
 * database and a rule for which one a control offers; if that becomes wanted, the honest
 * shape is a `Moodboard Palette` type rather than more strings in this field.
 */
export function PaletteEditor() {
  const { board, setPalette, canManage } = useBoard();
  const { portalHost } = useHost();
  const [open, setOpen] = useState(false);
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

  // A board that has never had a palette set still shows one: an empty strip reads as
  // broken, and the house colours are a better starting point than nothing.
  const colors = board.palette.length > 0 ? board.palette : DEFAULT_PALETTE;
  const replace = (i: number, color: string) =>
    setPalette(colors.map((c, n) => (n === i ? color : c)));
  const remove = (i: number) => setPalette(colors.filter((_, n) => n !== i));

  return (
    <>
      {/* The palette is the wedding's, so it is on screen rather than behind a button:
          it is read at a glance far more often than it is edited. Clicking opens the
          editor — for a planner. A client sees the same strip and can't change it. */}
      <button
        ref={anchorRef}
        type="button"
        className={`palette-strip ${open ? 'is-open' : ''} ${canManage ? '' : 'is-static'}`}
        onClick={canManage ? () => setOpen((v) => !v) : undefined}
        data-tooltip={canManage ? 'Edit wedding colors' : 'Wedding colors'}
        aria-label={canManage ? 'Edit wedding colors' : 'Wedding colors'}
        aria-expanded={canManage ? open : undefined}
        disabled={!canManage}
      >
        <Palette size={12} strokeWidth={1.6} className="palette-strip-icon" />
        <span className="palette-strip-swatches">
          {colors.map((color, i) => (
            <span
              key={`${color}-${i}`}
              className="palette-strip-swatch"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>
      </button>

      {open &&
        at &&
        createPortal(
          <>
            <div className="vision-brief-scrim" onPointerDown={() => setOpen(false)} />
            <div className="palette-pop" style={{ left: at.left, top: at.top }}>
              <div className="vision-brief-pop-head">
                <p className="vision-brief-label">Wedding colors</p>
                <button
                  type="button"
                  className="vision-brief-close"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <X size={13} strokeWidth={1.6} />
                </button>
              </div>

              <p className="palette-hint">
                The wedding's colors. Offered everywhere one is chosen — text, outlines,
                fills, backgrounds.
              </p>

              <div className="palette-rows">
                {colors.map((color, i) => (
                  <div className="palette-row" key={`${color}-${i}`}>
                    <label className="palette-row-swatch" style={{ backgroundColor: color }}>
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => replace(i, e.target.value)}
                        aria-label={`Color ${i + 1}`}
                      />
                    </label>
                    <input
                      className="palette-row-hex"
                      value={color}
                      spellCheck={false}
                      onChange={(e) => {
                        const next = e.target.value.trim();
                        // Typing a hex passes through half-written values, so only commit
                        // once it is one — otherwise every keystroke writes a broken color.
                        if (/^#[0-9a-f]{6}$/i.test(next)) replace(i, next);
                      }}
                      aria-label={`Color ${i + 1} hex`}
                    />
                    <button
                      type="button"
                      className="palette-row-remove"
                      onClick={() => remove(i)}
                      aria-label={`Remove ${color}`}
                    >
                      <X size={12} strokeWidth={1.8} />
                    </button>
                  </div>
                ))}
              </div>

              {colors.length < MAX_COLORS && (
                <button
                  type="button"
                  className="palette-add"
                  onClick={() => setPalette([...colors, NEW_COLOR])}
                >
                  <Plus size={12} strokeWidth={1.8} />
                  Add color
                </button>
              )}
            </div>
          </>,
          portalHost
        )}
    </>
  );
}
