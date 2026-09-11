import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutTemplate, Sparkles } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { useHost } from '../embed/HostProvider';

type Template = { id: string; name: string; system: boolean };

/**
 * Save this board as a template, or start an empty one from one.
 *
 * Starting from a template is offered only while the board has no sections. Forking into a
 * board someone has already worked on would mean merging two boards, and there is no
 * sensible answer to what happens to the slides already there.
 */
export function TemplateMenu() {
  const { board, canManage, saveAsTemplate, applyTemplate, listTemplates, isCloning } =
    useBoard();
  const { portalHost } = useHost();
  const [mode, setMode] = useState<'save' | 'start' | null>(null);
  const [name, setName] = useState('');
  const [templates, setTemplates] = useState<Template[] | null>(null);
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

  if (!canManage) return null;

  const close = () => {
    setMode(null);
    setName('');
    setTemplates(null);
    setSaved(false);
  };

  return (
    <>
      <div className="template-menu-wrap" ref={anchorRef}>
        <button
          type="button"
          className={`btn-ghost btn-sm ${open ? 'active' : ''}`}
          onClick={() => setOpen((v) => !v)}
          data-tooltip="Templates"
          aria-expanded={open}
        >
          <LayoutTemplate size={13} strokeWidth={1.5} />
          <span className="btn-label">Templates</span>
        </button>
        {open && (
          <div className="template-menu" role="menu">
            {isEmpty && (
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
                      Saved. It will show up under Start from a template on any new board.
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
                ) : templates.length === 0 ? (
                  <p className="modal-copy">
                    No templates yet. Build a board, then save it as one.
                  </p>
                ) : (
                  <ul className="template-list">
                    {templates.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          className="template-list-item"
                          disabled={isCloning}
                          onClick={async () => {
                            await applyTemplate(t.id);
                            close();
                          }}
                        >
                          <span className="template-list-name">{t.name}</span>
                          {t.system && (
                            <span className="template-list-tag">
                              <Sparkles size={10} strokeWidth={1.8} />
                              Gatherwise
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
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
