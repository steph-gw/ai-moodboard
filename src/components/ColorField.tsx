import { useEffect, useRef, useState } from 'react';
import { useBoard } from '../context/BoardContext';

/**
 * One swatch that opens the palette, rather than the whole palette inline.
 *
 * The toolbar floats beside the element, so every control in it competes with the slide
 * for space — five swatches per colour meant two colours ate half the bar. This shows the
 * current colour and puts the choices one click away.
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
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const none = value === 'transparent';

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

  return (
    <div className="color-field" ref={wrapRef}>
      <button
        type="button"
        className={`color-field-trigger ${none ? 'is-none' : ''}`}
        style={none ? undefined : { backgroundColor: value }}
        onClick={() => setOpen((v) => !v)}
        data-tooltip={label}
        aria-label={label}
        aria-expanded={open}
      />

      {open && (
        <div className="color-field-pop" role="dialog" aria-label={label}>
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
        </div>
      )}
    </div>
  );
}
