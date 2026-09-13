import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, LayoutTemplate } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { useHost } from '../embed/HostProvider';

type Template = { id: string; name: string; system: boolean };

/**
 * Save this board as a template, or rebuild it from one.
 *
 * Starting from a template replaces what is on the board, so the dropdown and the sentence
 * under it are the whole safety step: the choice and its consequence are on screen at the
 * same time, and nothing happens until Replace is pressed. Archiving rather than deleting
 * is what makes that survivable if someone presses it anyway.
 */
export function TemplateMenu() {
  const { board, canUseTemplates, saveAsTemplate, applyTemplate, startFromScratch, listTemplates, isCloning } =
    useBoard();
  const { portalHost } = useHost();
  const [mode, setMode] = useState<'save' | 'start' | null>(null);
  const [name, setName] = useState('');
  const [templates, setTemplates] = useState<Template[] | null>(null);
  /**
   * What the dropdown is on: a template id, `scratch`, or nothing chosen yet. One value
   * rather than a second screen — the consequence is spelled out under the dropdown, so
   * the planner reads it with the choice still in front of them.
   */
  const [choice, setChoice] = useState('');
  /**
   * Which of the two ways to start is selected. Separate from the dropdown because they
   * are different answers, not two entries in one list: one picks a template, the other
   * throws the board away. A dropdown that mixed them made the second look like a third
   * template.
   */
  const [how, setHow] = useState<'template' | 'scratch'>('template');
  const [saved, setSaved] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const isEmpty = board.sections.length === 0;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!anchorRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!mode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCloning) {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Fetched when the menu opens rather than on every board load: it decides whether
  // "Start from a template" is worth offering, and that answer is only needed here.
  useEffect(() => {
    if (!open || templates !== null) return;
    let live = true;
    void listTemplates().then((list) => {
      if (live) setTemplates(list);
    });
    return () => {
      live = false;
    };
  }, [open, templates, listTemplates]);

  useEffect(() => {
    if (mode !== 'start') return;
    let live = true;
    void listTemplates().then((list) => {
      if (live) setTemplates(list);
    });
    return () => {
      live = false;
    };
  }, [mode, listTemplates]);

  if (!canUseTemplates) return null;

  const close = () => {
    setMode(null);
    setName('');
    setChoice('');
    setHow('template');
    setSaved(false);
  };

  const chosen = templates?.find((t) => t.id === choice) ?? null;

  return (
    <>
      <div className="template-menu-wrap" ref={anchorRef}>
        <button
          type="button"
          className={`btn-ghost btn-sm ${open ? 'active' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <LayoutTemplate size={13} strokeWidth={1.5} />
          <span className="btn-label">Templates</span>
          {/* Points up while the menu is open, so the button says what it is and what it
              is doing without needing the menu to be visible to work it out. */}
          <ChevronDown
            size={12}
            strokeWidth={1.6}
            className={`template-caret ${open ? 'is-open' : ''}`}
          />
        </button>
        {open && (
          <div className="template-menu" role="menu">
            {/* Offered whenever this business has templates — not only on an empty board.
                Replacing a board that already has work on it is a real thing to want; the
                confirm step is what makes it safe, not hiding the option. */}
            {templates !== null && templates.length > 0 && (
              <button
                type="button"
                className="template-menu-item"
                onClick={() => {
                  setOpen(false);
                  setMode('start');
                }}
              >
                Start from a template
              </button>
            )}
            <button
              type="button"
              className="template-menu-item"
              disabled={isEmpty}
              onClick={() => {
                setOpen(false);
                setMode('save');
              }}
            >
              Save as template
            </button>
          </div>
        )}
      </div>

      {mode &&
        createPortal(
          <div
            className="modal-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !isCloning) close();
            }}
          >
            <div className="modal-card modal-card-narrow" role="dialog" aria-modal="true">
              <div className="modal-head">
                <p className="modal-eyebrow">Templates</p>
                <h2 className="modal-title modal-title-sm">
                  {mode === 'save' ? 'Save as template' : 'Start from a template'}
                </h2>
              </div>

              <div className="modal-body">
                {mode === 'save' ? (
                  saved ? (
                    <p className="modal-copy">
                      Saved. It will show up under Start from a template on any of this
                      business's boards.
                    </p>
                  ) : (
                    <>
                      <p className="modal-copy">
                        Copies the sections, slides, canvas, images and palette. Comments,
                        votes and approvals are left behind.
                      </p>
                      <label className="modal-label" htmlFor="template-name">
                        Template name <span className="modal-req">*</span>
                      </label>
                      <input
                        id="template-name"
                        className="modal-input"
                        placeholder="Garden wedding, Modern minimal…"
                        value={name}
                        autoFocus
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && name.trim()) void submitSave();
                        }}
                        aria-label="Template name"
                      />
                    </>
                  )
                ) : templates === null ? (
                  <p className="modal-copy">Loading templates…</p>
                ) : (
                  <>
                    <div className="modal-choice-row" role="radiogroup" aria-label="How to start">
                      <label className={`modal-choice ${how === 'template' ? 'is-on' : ''}`}>
                        <input
                          type="radio"
                          name="template-how"
                          checked={how === 'template'}
                          disabled={isCloning}
                          onChange={() => setHow('template')}
                        />
                        Use a template
                      </label>
                      <label className={`modal-choice ${how === 'scratch' ? 'is-on' : ''}`}>
                        <input
                          type="radio"
                          name="template-how"
                          checked={how === 'scratch'}
                          disabled={isCloning}
                          onChange={() => setHow('scratch')}
                        />
                        Start from scratch
                      </label>
                    </div>

                    {how === 'template' ? (
                      <>
                        <label className="modal-label" htmlFor="template-choice">
                          Templates
                        </label>
                        <select
                          id="template-choice"
                          className="modal-input modal-select"
                          value={choice}
                          disabled={isCloning || templates.length === 0}
                          onChange={(e) => setChoice(e.target.value)}
                        >
                          <option value="">
                            {templates.length === 0
                              ? 'No templates saved yet'
                              : 'Choose a template…'}
                          </option>
                          {/* One flat list. Gatherwise's own sort first, which is enough
                              to tell them apart without grouping the list into pieces. */}
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        {chosen && (
                          <p className="modal-copy is-quiet">
                            <strong>{chosen.name}</strong> will replace what is on
                            {board.weddingName ? ` ${board.weddingName}'s` : ' this'}{' '}
                            moodboard. The current sections are archived rather than
                            deleted, so nothing is lost.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="modal-copy is-quiet">
                        Empties
                        {board.weddingName ? ` ${board.weddingName}'s` : ' this'} moodboard
                        and leaves one blank slide.
                      </p>
                    )}
                  </>
                )}
              </div>

              {mode === 'save' && !saved && (
                <div className="modal-foot">
                  <button type="button" className="modal-btn-cancel" onClick={close}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="modal-btn-save"
                    disabled={!name.trim() || isCloning}
                    onClick={() => void submitSave()}
                  >
                    {isCloning ? 'Saving…' : 'Save template'}
                  </button>
                </div>
              )}

              {mode === 'start' && (
                <div className="modal-foot">
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    disabled={isCloning}
                    onClick={close}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="modal-btn-save"
                    disabled={isCloning || (how === 'template' && !choice)}
                    onClick={async () => {
                      if (how === 'scratch') await startFromScratch();
                      else await applyTemplate(choice);
                      close();
                    }}
                  >
                    {isCloning
                      ? 'Replacing…'
                      : how === 'scratch'
                        ? 'Empty this moodboard'
                        : 'Replace moodboard'}
                  </button>
                </div>
              )}
            </div>
          </div>,
          portalHost
        )}
    </>
  );

  async function submitSave() {
    const id = await saveAsTemplate(name);
    if (id) setSaved(true);
  }
}
