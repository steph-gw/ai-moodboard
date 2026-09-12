import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Lock, MessageCircle } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import type { Section } from '../types';
import { useHost } from '../embed/HostProvider';

type Choice = 'approved' | 'open';

const CHOICES: { value: Choice; label: string }[] = [
  { value: 'approved', label: 'Approved' },
  { value: 'open', label: 'Open' },
];

/** Anything not explicitly approved reads as Open. */
function toChoice(section: Section): Choice {
  return section.status === 'approved' ? 'approved' : 'open';
}

/**
 * The approval date goes to Bubble as ISO, because the field on Moodboard Section is a
 * date. A friendly "8 Sep" round-tripped through it came back as a raw timestamp; the
 * formatting belongs at the point of display (formatApprovalDate), not in the write.
 */
function today(): string {
  return new Date().toISOString();
}

export function SectionStatusSelect({ section }: { section: Section }) {
  const { updateSection, canManage } = useBoard();
  const { portalHost } = useHost();
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  
  const current = toChoice(section);

  useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('.status-menu')) close();
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

  // The date is recorded on the section but not shown. It was rendered raw, which on a
  // board whose date came from Bubble rather than from today() meant a full ISO string
  // sitting in the pill — and the pill is a status, not a log.
  const label = current === 'approved' ? 'Approved' : 'Open';

  // Approval freezes the section, so it is drawn with the same padlock the canvas and the
  // filmstrip use. One idea, one symbol — a tick said "good" where the truth is "closed".
  const icon =
    current === 'approved' ? (
      <Lock size={11} strokeWidth={2} />
    ) : (
      <MessageCircle size={12} strokeWidth={1.8} />
    );

  // Clients see the status but cannot change it.
  if (!canManage) {
    return (
      <span className={`status-pill is-${current}`}>
        {icon}
        {label}
      </span>
    );
  }

  const toggle = () => {
    if (anchor) {
      setAnchor(null);
      return;
    }
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({ top: rect.bottom + 6, left: rect.left });
  };

  const choose = (value: Choice) => {
    setAnchor(null);
    if (value === current) return;
    updateSection(section.id, {
      status: value,
      ...(value === 'approved' ? { approvedDate: today() } : {}),
    });
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`status-pill is-${current} is-interactive`}
        aria-haspopup="listbox"
        aria-expanded={!!anchor}
        aria-label={`Section status: ${label}`}
        onClick={toggle}
      >
        {icon}
        {label}
        <ChevronDown size={11} strokeWidth={2} className="status-pill-chevron" />
      </button>
      {anchor &&
        // Portalled: the canvas clips its overflow, so an in-place menu would
        // be cut off.
        createPortal(
          <div
            className="status-menu"
            role="listbox"
            style={{ top: anchor.top, left: anchor.left }}
          >
            {CHOICES.map(({ value, label: text }) => (
              <button
                key={value}
                type="button"
                role="option"
                aria-selected={value === current}
                className={`status-menu-item ${value === current ? 'active' : ''}`}
                onClick={() => choose(value)}
              >
                <span className={`status-menu-dot is-${value}`} />
                {text}
                {value === current && (
                  <Check size={12} strokeWidth={2} className="status-menu-check" />
                )}
              </button>
            ))}
          </div>,
          portalHost
        )}
    </>
  );
}
