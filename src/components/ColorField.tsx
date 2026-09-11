import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBoard } from '../context/BoardContext';
import { useHost } from '../embed/HostProvider';

/**
 * One swatch that opens the palette, rather than the whole palette inline.
 *
 * The toolbar floats beside the element, so every control in it competes with the slide
 * for space — five swatches per color meant two colors ate half the bar. This shows the
 * current color and puts the choices one click away.
 */
export function ColorField({
  label,
  value,
  onChange,
  allowNone,
  onNone,
}: {
  label: string;
  /** `transparent` renders as the no-fill swatch. */
  value: string;
  onChange: (color: string) => void;
  allowNone?: boolean;
  onNone?: () => void;
}) {
  const { board } = useBoard();
  const { portalHost } = useHost();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const none = value === 'transparent';

  // Rendered into the portal host rather than next to the swatch: the toolbar row it sits
  // in scrolls horizontally, and an absolutely positioned popover inside a scroll
  // container is clipped by it — the palette opened and was invisible.
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (r) setAt({ left: r.left + r.width / 2, top: r.bottom + 6 });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const node = e.target as Node;
      if (!wrapRef.current?.contains(node) && !popRef.current?.contains(node)) setOpen(false);
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
    <div className="color-field" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`color-field-trigger ${none ? 'is-none' : ''}`}
        style={none ? undefined : { backgroundColor: value }}
        onClick={() => setOpen((v) => !v)}
        data-tooltip={label}
        aria-label={label}
        aria-expanded={open}
      />

      {open &&
        at &&
        createPortal(
          <div
            ref={popRef}
            className="color-field-pop"
            style={{ left: at.left, top: at.top }}
            role="dialog"
            aria-label={label}
          >
          <div className="color-field-swatches">
            {allowNone && (
              <button
                type="button"
                className={`color-field-swatch is-none ${none ? 'active' : ''}`}
                onClick={() => {
                  onNone?.();
                  setOpen(false);
                }}
                data-tooltip="No fill"
                aria-label="No fill"
              />
            )}
            {board.palette.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-field-swatch ${!none && value === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
                aria-label={color}
              />
            ))}
          </div>
          <label className="color-field-custom">
            <input
              type="color"
              value={none ? '#ffffff' : value}
              onChange={(e) => onChange(e.target.value)}
            />
            <span>Custom…</span>
          </label>
          </div>,
          portalHost
        )}
    </div>
  );
}
