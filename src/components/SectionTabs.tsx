import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { sectionIcon } from '../utils/sectionIcons';
import { AddSectionModal } from './AddSectionModal';
import { ConfirmModal } from './ConfirmModal';
import type { Section } from '../types';
import { useHost } from '../embed/HostProvider';

function TabMenu({
  section,
  onEdit,
  onDelete,
}: {
  section: Section;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { portalHost } = useHost();
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('.section-tab-menu')) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [anchor]);

  const toggle = () => {
    if (anchor) {
      setAnchor(null);
      return;
    }
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  return (
    <>
      <span
        ref={btnRef}
        role="button"
        tabIndex={0}
        className="section-tab-menu-btn"
        aria-label={`${section.name} options`}
        aria-expanded={!!anchor}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }
        }}
      >
        <MoreVertical size={14} strokeWidth={1.6} />
      </span>
      {anchor &&
        // Portalled: the tab row scrolls and clips, so an in-place menu would
        // be cut off by its overflow.
        createPortal(
          <div
            className="section-tab-menu"
            role="menu"
            style={{ top: anchor.top, right: anchor.right }}
          >
            <button
              type="button"
              role="menuitem"
              className="section-tab-menu-item"
              onClick={() => {
                setAnchor(null);
                onEdit();
              }}
            >
              <Pencil size={13} strokeWidth={1.6} />
              Edit section
            </button>
            <button
              type="button"
              role="menuitem"
              className="section-tab-menu-item is-danger"
              onClick={() => {
                setAnchor(null);
                onDelete();
              }}
            >
              <Trash2 size={13} strokeWidth={1.6} />
              Delete section
            </button>
          </div>,
          portalHost
        )}
    </>
  );
}

export function SectionTabs() {
  const { board, role, activeSectionId, setActiveSectionId, deleteSection } = useBoard();
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [deleting, setDeleting] = useState<Section | null>(null);
  const isPlanner = role === 'planner';

  return (
    <nav className="section-tabs" aria-label="Sections">
      <div className="section-tabs-scroll">
        {board.sections.map((section) => {
          const isActive = activeSectionId === section.id;
          return (
            <button
              key={section.id}
              type="button"
              className={`section-tab ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveSectionId(section.id)}
            >
              <span className="section-tab-icon">{sectionIcon(section.icon)}</span>
              <span className="section-tab-name">{section.name}</span>
              {isActive && isPlanner && (
                <TabMenu
                  section={section}
                  onEdit={() => setEditing(section)}
                  onDelete={() => setDeleting(section)}
                />
              )}
            </button>
          );
        })}
        {isPlanner && (
          <button
            type="button"
            className="section-tab-add"
            onClick={() => setIsAdding(true)}
          >
            <Plus size={14} strokeWidth={1.5} />
            Add section
          </button>
        )}
      </div>

      {isAdding && <AddSectionModal onClose={() => setIsAdding(false)} />}
      {editing && (
        <AddSectionModal section={editing} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <ConfirmModal
          eyebrow="Delete section"
          title={deleting.name}
          body={`This removes the section and all ${deleting.slides.length} slide${
            deleting.slides.length !== 1 ? 's' : ''
          } inside it, along with their images and comments. You can undo this with ⌘Z.`}
          confirmLabel="Delete section"
          onConfirm={() => deleteSection(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </nav>
  );
}
