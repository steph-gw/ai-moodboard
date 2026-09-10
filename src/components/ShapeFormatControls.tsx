import { useBoard } from '../context/BoardContext';
import type { ShapeElement, StrokeStyle } from '../types';

const STROKE_STYLES: { value: StrokeStyle; label: string; dash: string }[] = [
  { value: 'solid', label: 'Solid', dash: '' },
  { value: 'dashed', label: 'Dashed', dash: '5 4' },
  { value: 'dotted', label: 'Dotted', dash: '0 5' },
];

/**
 * Shape controls for the floating toolbar. What's offered follows the shape: a line has no
 * interior to fill, and only a rectangle has corners to round.
 */
export function ShapeFormatControls({
  element,
  slideId,
}: {
  element: ShapeElement;
  slideId: string;
}) {
  const { updateElement, board } = useBoard();
  const patch = (updates: Partial<ShapeElement>) => updateElement(slideId, element.id, updates);

  const isLine = element.shape === 'line';
  // `transparent` is the no-fill value: a colour input can't express "none", so the swatch
  // that clears the fill sets it and the renderer treats it as nothing.
  const fill = element.fill ?? 'transparent';

  return (
    <>
      <div className="shape-format-group" role="group" aria-label="Line style">
        {STROKE_STYLES.map(({ value, label, dash }) => (
          <button
            key={value}
            type="button"
            className={`text-format-btn ${element.strokeStyle === value ? 'active' : ''}`}
            onClick={() => patch({ strokeStyle: value })}
            data-tooltip={label}
            aria-label={label}
            aria-pressed={element.strokeStyle === value}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden>
              <line
                x1="1.5"
                y1="7.5"
                x2="13.5"
                y2="7.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeDasharray={dash || undefined}
                strokeLinecap={value === 'dotted' ? 'round' : 'butt'}
              />
            </svg>
          </button>
        ))}
      </div>

      <span className="text-format-divider" />

      <div className="text-format-size">
        <span className="shape-format-label">Width</span>
        <input
          type="number"
          className="text-format-size-input"
          value={element.strokeWidth}
          min={0}
          max={40}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) patch({ strokeWidth: Math.min(40, Math.max(0, n)) });
          }}
          aria-label="Line width"
        />
      </div>

      {element.shape === 'rect' && (
        <>
          <span className="text-format-divider" />
          <div className="text-format-size">
            <span className="shape-format-label">Radius</span>
            <input
              type="number"
              className="text-format-size-input"
              value={element.radius ?? 0}
              min={0}
              max={200}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isNaN(n)) patch({ radius: Math.min(200, Math.max(0, n)) });
              }}
              aria-label="Corner radius"
            />
          </div>
        </>
      )}

      {element.shape === 'polygon' && (
        <>
          <span className="text-format-divider" />
          <div className="text-format-size">
            <span className="shape-format-label">Sides</span>
            <input
              type="number"
              className="text-format-size-input"
              value={element.sides ?? 5}
              min={3}
              max={12}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isNaN(n)) patch({ sides: Math.min(12, Math.max(3, Math.round(n))) });
              }}
              aria-label="Number of sides"
            />
          </div>
        </>
      )}

      <span className="text-format-divider" />

      <SwatchRow
        label={isLine ? 'Line colour' : 'Outline colour'}
        value={element.stroke}
        palette={board.palette}
        onChange={(stroke) => patch({ stroke })}
      />

      {!isLine && (
        <>
          <span className="text-format-divider" />
          <SwatchRow
            label="Fill colour"
            value={fill === 'transparent' ? '#ffffff' : fill}
            palette={board.palette}
            onChange={(next) => patch({ fill: next })}
            onClear={() => patch({ fill: 'transparent' })}
            cleared={fill === 'transparent'}
          />
        </>
      )}
    </>
  );
}

function SwatchRow({
  label,
  value,
  palette,
  onChange,
  onClear,
  cleared,
}: {
  label: string;
  value: string;
  palette: string[];
  onChange: (color: string) => void;
  onClear?: () => void;
  cleared?: boolean;
}) {
  return (
    <div className="text-format-colors" role="group" aria-label={label}>
      <label className="text-format-color-picker" aria-label={label}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <span
          className={`text-format-color-swatch current ${cleared ? 'is-none' : ''}`}
          style={{ backgroundColor: cleared ? 'transparent' : value }}
        />
      </label>
      {onClear && (
        <button
          type="button"
          className={`text-format-color-swatch is-none ${cleared ? 'active' : ''}`}
          onClick={onClear}
          data-tooltip="No fill"
          aria-label="No fill"
        />
      )}
      {palette.map((color) => (
        <button
          key={color}
          type="button"
          className={`text-format-color-swatch ${!cleared && value === color ? 'active' : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          aria-label={`${label} ${color}`}
        />
      ))}
    </div>
  );
}
