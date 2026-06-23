import { Bold, Italic, Minus, Plus } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import type { TextElement } from '../types';
import { TEXT_FONT_OPTIONS } from '../utils/textFonts';

export function TextFormatBar() {
  const { activeSlide, activeSlideId, selectedElementId, updateElement, board } =
    useBoard();

  const element = activeSlide?.elements.find((el) => el.id === selectedElementId);
  if (!element || element.type !== 'text' || !activeSlideId) return null;

  const text = element as TextElement;

  const patch = (updates: Partial<TextElement>) => {
    updateElement(activeSlideId, text.id, updates);
  };

  return (
    <div className="text-format-bar">
      <select
        className="text-format-select"
        value={text.fontFamily}
        onChange={(e) =>
          patch({ fontFamily: e.target.value as TextElement['fontFamily'] })
        }
        aria-label="Font family"
      >
        {TEXT_FONT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <span className="text-format-divider" />

      <button
        type="button"
        className={`text-format-btn ${text.bold ? 'active' : ''}`}
        onClick={() => patch({ bold: !text.bold })}
        aria-label="Bold"
        aria-pressed={!!text.bold}
      >
        <Bold size={13} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        className={`text-format-btn ${text.italic ? 'active' : ''}`}
        onClick={() => patch({ italic: !text.italic })}
        aria-label="Italic"
        aria-pressed={!!text.italic}
      >
        <Italic size={13} strokeWidth={2.2} />
      </button>

      <span className="text-format-divider" />

      <div className="text-format-size">
        <button
          type="button"
          className="text-format-size-btn"
          onClick={() => patch({ fontSize: Math.max(12, text.fontSize - 2) })}
          aria-label="Decrease font size"
        >
          <Minus size={12} strokeWidth={2} />
        </button>
        <input
          type="number"
          className="text-format-size-input"
          value={text.fontSize}
          min={12}
          max={120}
          onChange={(e) => {
            const size = Number(e.target.value);
            if (!Number.isNaN(size)) {
              patch({ fontSize: Math.min(120, Math.max(12, size)) });
            }
          }}
          aria-label="Font size"
        />
        <button
          type="button"
          className="text-format-size-btn"
          onClick={() => patch({ fontSize: Math.min(120, text.fontSize + 2) })}
          aria-label="Increase font size"
        >
          <Plus size={12} strokeWidth={2} />
        </button>
      </div>

      <span className="text-format-divider" />

      <div className="text-format-colors">
        <label className="text-format-color-picker" aria-label="Text color">
          <input
            type="color"
            value={text.color}
            onChange={(e) => patch({ color: e.target.value })}
          />
          <span
            className="text-format-color-swatch current"
            style={{ backgroundColor: text.color }}
          />
        </label>
        {board.palette.map((color) => (
          <button
            key={color}
            type="button"
            className={`text-format-color-swatch ${text.color === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => patch({ color })}
            aria-label={`Set color ${color}`}
          />
        ))}
      </div>
    </div>
  );
}
