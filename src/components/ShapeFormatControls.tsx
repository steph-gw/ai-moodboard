import { CornerUpLeft, Hexagon, Minus } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { ColorField } from './ColorField';
import type { ShapeElement, StrokeStyle } from '../types';

const STROKE_STYLES: { value: StrokeStyle; label: string; dash: string }[] = [
  { value: 'solid', label: 'Solid', dash: '' },
  { value: 'dashed', label: 'Dashed', dash: '5 4' },
  { value: 'dotted', label: 'Dotted', dash: '0 5' },
];

/**
 * Shape controls for the floating toolbar.
 *
 * What's offered follows the shape: only a line is a line, so only a line gets dash
 * styles; only a rectangle has corners to round; only a polygon has a side count. Labels
 * are icons — the toolbar sits beside the element and words like "Radius" pushed it wider
 * than most of the shapes it was labelling.
 */
export function ShapeFormatControls({
  element,
  slideId,
}: {
  element: ShapeElement;
  slideId: string;
}) {
  const { updateElement } = useBoard();
  const patch = (updates: Partial<ShapeElement>) => updateElement(slideId, element.id, updates);
  const isLine = element.shape === 'line';

  return (
    <>
      {isLine &&
        STROKE_STYLES.map(({ value, label, dash }) => (
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
      {isLine && <span className="text-format-divider" />}

      <NumberField
        icon={<Minus size={13} strokeWidth={2.4} />}
        label={isLine ? 'Line width' : 'Outline width'}
        value={element.strokeWidth}
        min={0}
        max={40}
        onChange={(strokeWidth) => patch({ strokeWidth })}
      />

      {element.shape === 'rect' && (
        <NumberField
          icon={<CornerUpLeft size={13} strokeWidth={1.8} />}
          label="Corner radius"
          value={element.radius ?? 0}
          min={0}
          max={200}
          onChange={(radius) => patch({ radius })}
        />
      )}

      {element.shape === 'polygon' && (
        <NumberField
          icon={<Hexagon size={13} strokeWidth={1.8} />}
          label="Number of sides"
          value={element.sides ?? 5}
          min={3}
          max={12}
          onChange={(sides) => patch({ sides: Math.round(sides) })}
        />
      )}

      <span className="text-format-divider" />

      <ColorField
        label={isLine ? 'Line colour' : 'Outline colour'}
        value={element.stroke}
        onChange={(stroke) => patch({ stroke })}
      />

      {!isLine && (
        <ColorField
          label="Fill colour"
          value={element.fill ?? 'transparent'}
          onChange={(fill) => patch({ fill })}
          allowNone
          onNone={() => patch({ fill: 'transparent' })}
        />
      )}
    </>
  );
}

function NumberField({
  icon,
  label,
  value,
  min,
  max,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="num-field" data-tooltip={label}>
      <span className="num-field-icon" aria-hidden>
        {icon}
      </span>
      <input
        type="number"
        className="num-field-input"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        aria-label={label}
      />
    </div>
  );
}
