import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBoard } from '../context/BoardContext';
import {
  SECTION_ICON_KEYS,
  inferSectionIcon,
  sectionIcon,
} from '../utils/sectionIcons';
import type { Section } from '../types';
import { useHost } from '../embed/HostProvider';

interface AddSectionModalProps {
  onClose: () => void;
  /** When given, the modal edits that section instead of creating one. */
  section?: Section;
}

export function AddSectionModal({ onClose, section }: AddSectionModalProps) {
  const { addSection, updateSection, visionBrief, activeSectionId } = useBoard();
  const { portalHost } = useHost();
  const isEditing = !!section;
  const [name, setName] = useState(section?.name ?? '');
  const [brief, setBrief] = useState(
    section
      ? (section.visionBrief ?? (section.id === activeSectionId ? visionBrief : ''))
      : ''
  );
  const [iconOverride, setIconOverride] = useState<string | null>(
    section?.icon ?? null
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (pickerOpen) setPickerOpen(false);
      else onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, pickerOpen]);

  const hasName = name.trim().length > 0;
  const icon = iconOverride ?? inferSectionIcon(name);

  const handleSave = () => {
    if (!hasName) return;
    if (section) {
      updateSection(section.id, { name, icon, visionBrief: brief });
    } else {
      addSection(name, brief, icon);
    }
    onClose();
  };

  // Portalled to <body> so the dim covers the app header too.
  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-section-title"
      >
        <div className="modal-head">
          <p className="modal-eyebrow">{isEditing ? 'Edit section' : 'New section'}</p>
          <h2 className="modal-title" id="add-section-title">
            {isEditing ? section.name : 'Set the scene'}
          </h2>
        </div>

        <div className="modal-body">
          <div className="modal-field">
            <label className="modal-label" htmlFor="section-name">
              Section name <span className="modal-req">*</span>
            </label>
            <div className={`modal-input-wrap ${hasName ? 'has-icon' : ''}`}>
              {hasName && (
                <button
                  type="button"
                  className="modal-input-icon"
                  aria-label="Change icon"
                  aria-expanded={pickerOpen}
                  onClick={() => setPickerOpen((open) => !open)}
                >
                  {sectionIcon(icon, 16)}
                </button>
              )}
              <input
                id="section-name"
                ref={nameRef}
                className="modal-input"
                type="text"
                value={name}
                placeholder="Florals, Stationery, Cocktail hour…"
                onChange={(e) => {
                  setName(e.target.value);
                  setPickerOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
              />
              {pickerOpen && (
                <div className="icon-picker" role="listbox" aria-label="Section icon">
                  {SECTION_ICON_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="option"
                      aria-selected={key === icon}
                      className={`icon-picker-item ${key === icon ? 'active' : ''}`}
                      title={key}
                      onClick={() => {
                        setIconOverride(key);
                        setPickerOpen(false);
                      }}
                    >
                      {sectionIcon(key, 16)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="section-brief">
              Vision brief
            </label>
            <textarea
              id="section-brief"
              className="modal-input modal-textarea"
              value={brief}
              rows={4}
              placeholder="Describe the mood, palette and materials for this section…"
              onChange={(e) => setBrief(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="modal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="modal-btn-save"
            onClick={handleSave}
            disabled={!hasName}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    portalHost
  );
}
