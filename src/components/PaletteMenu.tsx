import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Palette as PaletteIcon, Plus, Trash2, X } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { useHost } from '../embed/HostProvider';
import { ColorField } from './ColorField';

const FALLBACK_COLOR = '#D9D2C7';

/** A blank row starts from the last color picked, which is usually near the next one. */
function nextColor(colors: string[]): string {
  return colors[colors.length - 1] ?? FALLBACK_COLOR;
}

/**
 * Palettes: make one, then drop it on the board.
 *
 * Before the first palette exists the button is a plain button — a dropdown that opens
 * onto nothing is a dead end. Once there is one it becomes a menu of palettes, each shown
 * as its own colors, because a name alone doesn't tell you which palette you mean.
 */
export function PaletteMenu() {
  const { board, createPalette, deletePalette, placePalette } = useBoard();
  const { portalHost } = useHost();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [colors, setColors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const palettes = board.palettes;
  const hasPalettes = palettes.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        e.stopPropagation();
        closeEditor();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const openEditor = () => {
    setOpen(false);
    // The colors already on this moodboard are the obvious first palette — they were
    // picked for this wedding. Offered as a starting point rather than migrated behind
    // the planner's back, so nothing is written until they press Create.
    const seed = !hasPalettes && board.palette.length > 0 ? board.palette : [];
    setName(seed.length ? 'Wedding palette' : '');
    setColors(seed.length ? [...seed] : [FALLBACK_COLOR]);
    setEditing(true);
  };

  const closeEditor = () => {
    setEditing(false);
    setName('');
    setColors([]);
    setSaving(false);
  };

  const submit = async () => {
    setSaving(true);
    const ok = await createPalette(name, colors);
    setSaving(false);
    if (ok) closeEditor();
  };

  const canSave = name.trim().length > 0 && colors.length > 0 && !saving;

  return (
    <>
      <div className="palette-menu-wrap" ref={wrapRef}>
        <button
          type="button"
          className={`btn-ghost btn-sm ${open ? 'active' : ''}`}
          onClick={() => (hasPalettes ? setOpen((v) => !v) : openEditor())}
          aria-expanded={hasPalettes ? open : undefined}
          aria-haspopup={hasPalettes ? 'menu' : 'dialog'}
        >
          <PaletteIcon size={13} strokeWidth={1.5} />
          Add palette
          {hasPalettes &&
            (open ? (
              <ChevronUp size={11} strokeWidth={1.8} />
            ) : (
              <ChevronDown size={11} strokeWidth={1.8} />
            ))}
        </button>

        {open && hasPalettes && (
          <div className="palette-menu" role="menu">
            {palettes.map((palette) => (
              <div className="palette-menu-row" key={palette.id}>
                <button
                  type="button"
                  className="palette-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    placePalette(palette.id);
                  }}
                  title={`Place ${palette.name} on this slide`}
                >
                  <span className="palette-menu-name">{palette.name}</span>
                  {/* The colors, stacked the way they will land on the slide. */}
                  <span className="palette-menu-colors">
                    {palette.colors.map((color, i) => (
                      <span
                        key={`${color}-${i}`}
                        className="palette-menu-chip"
                        style={{ background: color }}
                      />
                    ))}
                  </span>
                </button>
                {/* Removing a palette leaves every swatch already placed alone — they are
                    copies of the colors, not views onto the palette. */}
                <button
                  type="button"
                  className="palette-menu-delete"
                  onClick={() => deletePalette(palette.id)}
                  data-tooltip="Delete palette"
                  aria-label={`Delete ${palette.name}`}
                >
                  <Trash2 size={12} strokeWidth={1.6} />
                </button>
              </div>
            ))}
            <button type="button" className="palette-menu-add" onClick={openEditor}>
              <Plus size={13} strokeWidth={1.8} />
              Add palette
            </button>
          </div>
        )}
      </div>

      {editing &&
        createPortal(
          <div
            className="modal-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !saving) closeEditor();
            }}
          >
            <div className="modal-card modal-card-narrow" role="dialog" aria-modal="true">
              <div className="modal-head">
                <p className="modal-eyebrow">Palette</p>
                <h2 className="modal-title modal-title-sm">Create a color palette</h2>
              </div>

              <div className="modal-body">
                <label className="modal-label" htmlFor="palette-name">
                  Palette name <span className="modal-req">*</span>
                </label>
                <input
                  id="palette-name"
                  className="modal-input"
                  placeholder="Wedding palette, Ceremony…"
                  value={name}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canSave) void submit();
                  }}
                />

                <label className="modal-label">Colors</label>
                <div className="palette-rows">
                  {colors.map((color, i) => (
                    <div className="palette-row" key={i}>
                      <ColorField
                        label={`Color ${i + 1}`}
                        value={color}
                        onChange={(next) =>
                          setColors((prev) => prev.map((c, j) => (j === i ? next : c)))
                        }
                      />
                      <input
                        className="palette-row-hex"
                        value={color.toUpperCase()}
                        spellCheck={false}
                        aria-label={`Color ${i + 1} hex`}
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          const next = raw.startsWith('#') ? raw : `#${raw}`;
                          setColors((prev) => prev.map((c, j) => (j === i ? next : c)));
                        }}
                      />
                      <button
                        type="button"
                        className="palette-row-remove"
                        onClick={() => setColors((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`Remove color ${i + 1}`}
                      >
                        <X size={13} strokeWidth={1.8} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="palette-add-color"
                  onClick={() => setColors((prev) => [...prev, nextColor(prev)])}
                >
                  <Plus size={13} strokeWidth={1.8} />
                  Add color
                </button>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="modal-btn-cancel"
                  disabled={saving}
                  onClick={closeEditor}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="modal-btn-save"
                  disabled={!canSave}
                  onClick={() => void submit()}
                >
                  {saving ? 'Saving…' : 'Create palette'}
                </button>
              </div>
            </div>
          </div>,
          portalHost
        )}
    </>
  );
}
