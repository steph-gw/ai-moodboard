import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Circle, Minus, Pentagon, Shapes, Square, Triangle } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import type { ShapeKind } from '../types';

const SHAPES: { kind: ShapeKind; label: string; Icon: typeof Circle }[] = [
  { kind: 'line', label: 'Line', Icon: Minus },
  { kind: 'rect', label: 'Square', Icon: Square },
  { kind: 'ellipse', label: 'Circle', Icon: Circle },
  { kind: 'triangle', label: 'Triangle', Icon: Triangle },
  { kind: 'polygon', label: 'Polygon', Icon: Pentagon },
];

export function AddElementsMenu() {
  const { addShapeElement } = useBoard();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Scoped to the mount root by the pointerdown target check rather than a global
    // capture, so clicking inside the menu doesn't close it before the click lands.
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

  return (
    <div className="add-elements" ref={wrapRef}>
      <button
        type="button"
        className={`btn-ghost btn-sm ${open ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Shapes size={13} strokeWidth={1.5} />
        Add elements
        {/* Points the way the menu will move, the same as the status pill. */}
        {open ? (
          <ChevronUp size={11} strokeWidth={1.8} />
        ) : (
          <ChevronDown size={11} strokeWidth={1.8} />
        )}
      </button>

      {open && (
        <div className="add-elements-menu" role="menu">
          {SHAPES.map(({ kind, label, Icon }) => (
            <button
              key={kind}
              type="button"
              className="add-elements-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                addShapeElement(kind);
              }}
            >
              <Icon size={14} strokeWidth={1.6} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
