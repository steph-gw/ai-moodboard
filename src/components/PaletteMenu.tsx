import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Palette as PaletteIcon,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { useHost } from '../embed/HostProvider';
import { ColorField } from './ColorField';
import { readHex } from '../utils/hex';
import { rememberColor } from '../utils/recentColors';
import { ConfirmModal } from './ConfirmModal';

const FALLBACK_COLOR = '#D9D2C7';

let rowSeq = 0;
function newRow(hex: string): { id: string; hex: string } {
  rowSeq += 1;
  return { id: `row-${rowSeq}`, hex };
}

/** A new row starts from the last color picked, which is usually near the next one. */
function nextColor(rows: { hex: string }[]): string {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const hex = readHex(rows[i].hex);
    if (hex) return hex;
  }
  return FALLBACK_COLOR;
}

/**
 * Palettes: make one, then drop it on the board.
 *
 * Before the first palette exists the button is a plain button — a dropdown that opens
 * onto nothing is a dead end. Once there is one it becomes a menu of palettes, each shown
 * as its own colors, because a name alone doesn't tell you which palette you mean.
 */
export function PaletteMenu() {
  const { board, createPalette, updatePalette, deletePalette, placePalette } = useBoard();
  const { portalHost } = useHost();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  /**
   * Editor rows. Each carries an id of its own rather than being identified by position:
   * React reuses DOM by key, so keying a reorderable list by index makes the inputs stay
   * put while the values move under them — which is exactly what "things jump around"
   * looks like.
   */
  const [rows, setRows] = useState<{ id: string; hex: string }[]>([]);
  const [saving, setSaving] = useState(false);
  /** The row being dragged, and the slot it is currently hovering over. */
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  /** The palette being edited, or null when the editor is making a new one. */
  const [editingId, setEditingId] = useState<string | null>(null);
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

  /** Opens the same editor on an existing palette, filled in with what it holds. */
  const openEditorFor = (palette: { id: string; name: string; colors: string[] }) => {
    setOpen(false);
    setEditingId(palette.id);
    setName(palette.name);
    setRows(palette.colors.map((c) => newRow(c.toUpperCase())));
    setEditing(true);
  };

  const openEditor = () => {
    setOpen(false);
    setEditingId(null);
    // The colors already on this moodboard are the obvious first palette — they were
    // picked for this wedding. Offered as a starting point rather than migrated behind
    // the planner's back, so nothing is written until they press Create.
    const seed = !hasPalettes && board.palette.length > 0 ? board.palette : [];
    setName(seed.length ? 'Wedding palette' : '');
    // No blank first row. An empty slot with a default color in it is a color the planner
    // never chose, and the one thing worse than no palette is a palette with a wrong color
    // in it that nobody put there.
    setRows(seed.map((c) => newRow(c.toUpperCase())));
    setEditing(true);
  };

  const closeEditor = () => {
    setEditing(false);
    setEditingId(null);
    setName('');
    setRows([]);
    setSaving(false);
  };

  const submit = async () => {
    setSaving(true);
    const clean = rows.map((r) => readHex(r.hex)).filter((c): c is string => !!c);
    const ok = editingId
      ? await updatePalette(editingId, { name, colors: clean })
      : await createPalette(name, clean);
    setSaving(false);
    if (ok) closeEditor();
  };

  /**
   * Drops the dragged row where the line is drawn: above the hovered row when dragging up,
   * below it when dragging down.
   *
   * The insert index is then shifted back by one when the row being moved sat before it,
   * because removing it moves everything after it up. Without that, a row dragged downward
   * always landed one place further than the line promised.
   */
  const moveRow = (from: number, over: number) => {
    if (from === over) return;
    setRows((prev) => {
      const insertAt = from < over ? over + 1 : over;
      const moved = prev[from];
      const without = prev.filter((_, i) => i !== from);
      without.splice(insertAt - (from < insertAt ? 1 : 0), 0, moved);
      return without;
    });
  };

  const valid = rows.filter((r) => readHex(r.hex)).length;
  const canSave = name.trim().length > 0 && valid > 0 && !saving;

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
                <span className="palette-menu-actions">
                <button
                  type="button"
                  className="palette-menu-edit"
                  onClick={() => openEditorFor(palette)}
                  data-tooltip="Edit palette"
                  aria-label={`Edit ${palette.name}`}
                >
                  <Pencil size={12} strokeWidth={1.6} />
                </button>
                {/* Removing a palette leaves every swatch already placed alone — they are
                    copies of the colors, not views onto the palette. */}
                <button
                  type="button"
                  className="palette-menu-delete"
                  onClick={() => {
                    setOpen(false);
                    setConfirmDelete({ id: palette.id, name: palette.name });
                  }}
                  data-tooltip="Delete palette"
                  aria-label={`Delete ${palette.name}`}
                >
                  <Trash2 size={12} strokeWidth={1.6} />
                </button>
                </span>
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
                <h2 className="modal-title modal-title-sm">
                  {editingId ? 'Edit palette' : 'Create a color palette'}
                </h2>
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

                {rows.length > 0 && <label className="modal-label modal-label-spaced">Colors</label>}
                <div className="palette-rows">
                  {rows.map((row, i) => (
                    <div
                      className={`palette-row${drag?.from === i ? ' is-dragging' : ''}${
                        drag && drag.over === i && drag.from !== i
                          ? drag.from < i
                            ? ' is-over-below'
                            : ' is-over-above'
                          : ''
                      }`}
                      key={row.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        // Firefox ignores a drag that carries no data at all.
                        e.dataTransfer.setData('text/plain', String(i));
                        setDrag({ from: i, over: i });
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDrag((d) => (d && d.over !== i ? { ...d, over: i } : d));
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (drag) moveRow(drag.from, i);
                        setDrag(null);
                      }}
                      onDragEnd={() => setDrag(null)}
                    >
                      <span className="palette-row-grip" aria-hidden>
                        <GripVertical size={13} strokeWidth={1.7} />
                      </span>
                      <ColorField
                        label={`Color ${i + 1}`}
                        value={readHex(row.hex) ?? 'transparent'}
                        onChange={(next) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, hex: next.toUpperCase() } : r
                            )
                          )
                        }
                      />
                      <input
                        className={`palette-row-hex${readHex(row.hex) ? '' : ' is-pending'}`}
                        value={row.hex}
                        placeholder="#F6EFE0"
                        spellCheck={false}
                        aria-label={`Color ${i + 1} hex`}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, hex: e.target.value } : r))
                          )
                        }
                        onBlur={() => {
                          // Tidied only once they have moved on: #f6efe0 becomes #F6EFE0,
                          // and a half-typed value is left alone to be finished.
                          const hex = readHex(row.hex);
                          if (!hex) return;
                          rememberColor(hex);
                          setRows((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, hex: hex.toUpperCase() } : r
                            )
                          );
                        }}
                      />
                      <button
                        type="button"
                        className="palette-row-remove"
                        onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                        aria-label={`Remove color ${i + 1}`}
                      >
                        <X size={13} strokeWidth={1.8} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className={`palette-add-color${rows.length === 0 ? ' is-first' : ''}`}
                  onClick={() => setRows((prev) => [...prev, newRow(nextColor(prev))])}
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
                  {saving ? 'Saving…' : editingId ? 'Save palette' : 'Create palette'}
                </button>
              </div>
            </div>
          </div>,
          portalHost
        )}

      {confirmDelete && (
        <ConfirmModal
          eyebrow="Palette"
          title={`Delete ${confirmDelete.name}?`}
          body="The palettes already placed on slides keep their colors — they are copies. This only removes the palette from the menu."
          confirmLabel="Delete palette"
          onConfirm={() => {
            deletePalette(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}
