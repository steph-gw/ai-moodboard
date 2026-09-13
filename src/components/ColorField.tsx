import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBoard } from '../context/BoardContext';
import { useHost } from '../embed/HostProvider';
import { rememberColor, useRecentColors } from '../utils/recentColors';
import { readHex } from '../utils/hex';

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
  const recent = useRecentColors();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  /** What the hex box shows while it is being typed in. Null means "follow the value". */
  const [typed, setTyped] = useState<string | null>(null);
  const none = value === 'transparent';

  const pick = (color: string) => {
    rememberColor(color);
    onChange(color);
  };

  /**
   * The board's own colors: the named palettes if there are any, and otherwise the
   * original single palette. Falling back rather than showing both keeps a board that has
   * moved on to named palettes from still offering the colors it left behind.
   */
  const boardColors = Array.from(
    new Set(
      board.palettes.length > 0 ? board.palettes.flatMap((p) => p.colors) : board.palette
    )
  );

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
            {boardColors.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-field-swatch ${!none && value === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  pick(color);
                  setOpen(false);
                }}
                aria-label={color}
              />
            ))}
          </div>

          {/* Only once something has been picked. An empty "Recent" heading on a fresh
              board is a promise of nothing. */}
          {recent.length > 0 && (
            <>
              <p className="color-field-heading">Recent</p>
              <div className="color-field-swatches">
                {recent.map((color) => (
                  <button
                    key={`recent-${color}`}
                    type="button"
                    className={`color-field-swatch ${!none && value === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      pick(color);
                      setOpen(false);
                    }}
                    aria-label={color}
                  />
                ))}
              </div>
            </>
          )}
          {/* The hex, readable and copyable. Asked for so a color can be taken out of the
              board and used somewhere else — and it takes one too, which is quicker than
              hunting for a shade in the system picker. */}
          <div className="color-field-hex">
            <input
              value={typed ?? (none ? '' : value.toUpperCase())}
              placeholder="#F6EFE0"
              spellCheck={false}
              aria-label="Hex code"
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => {
                setTyped(e.target.value);
                const hex = readHex(e.target.value);
                if (hex) pick(hex);
              }}
              onBlur={() => setTyped(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setTyped(null);
                  setOpen(false);
                }
              }}
            />
          </div>

          <label className="color-field-custom">
            <input
              type="color"
              value={none ? '#ffffff' : value}
              onChange={(e) => pick(e.target.value)}
            />
            <span>Custom…</span>
          </label>
          </div>,
          portalHost
        )}
    </div>
  );
}
