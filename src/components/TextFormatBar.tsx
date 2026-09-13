import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalSpaceAround,
  AlignHorizontalSpaceAround,
  Bold,
  Italic,
  Minus,
  Plus,
} from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { ColorField } from './ColorField';
import { loadFont } from '../utils/loadFont';
import type { TextElement } from '../types';
import {
  DEFAULT_LETTER_SPACING,
  DEFAULT_LINE_HEIGHT,
  MAX_LETTER_SPACING,
  MAX_LINE_HEIGHT,
  MIN_LETTER_SPACING,
  MIN_LINE_HEIGHT,
} from '../types';
import { TEXT_FONT_OPTIONS } from '../utils/textFonts';

/**
 * The text controls on their own, so the floating element toolbar can hold them without
 * inheriting the old bar's own box — which used to sit in the header and resize the stage.
 */
export function TextFormatControls({
  element: text,
  slideId,
  applyToIds,
}: {
  element: TextElement;
  slideId: string;
  /** Every element the change applies to. Defaults to the one whose values are shown. */
  applyToIds?: readonly string[];
}) {
  const { updateElement } = useBoard();

  // Applied to every selected element of this type, which is what makes changing the font
  // color of five headings one action instead of five.
  const patch = (updates: Partial<TextElement>) => {
    for (const id of applyToIds ?? [text.id]) updateElement(slideId, id, updates);
  };

  return (
    <>
      <select
        className="text-format-select"
        value={text.fontFamily}
        onChange={(e) => {
          const family = e.target.value as TextElement['fontFamily'];
          // Fetched on choice rather than up front — see loadFont.
          loadFont(family);
          patch({ fontFamily: family });
        }}
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

      {/* Alignment. Icons rather than a dropdown: three mutually exclusive choices that are
          read at a glance are cheaper as three buttons than as a menu hiding two of them. */}
      {ALIGNMENTS.map(({ value, Icon, label }) => (
        <button
          key={value}
          type="button"
          className={`text-format-btn ${text.align === value ? 'active' : ''}`}
          onClick={() => patch({ align: value })}
          aria-label={label}
          aria-pressed={text.align === value}
          data-tooltip={label}
        >
          <Icon size={14} strokeWidth={1.8} />
        </button>
      ))}

      <ColorField
        label="Text color"
        value={text.color}
        onChange={(color) => patch({ color })}
      />

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

      {/* Beside the size, because line height is only ever read in relation to it. Stored
          as a multiplier so it survives a size change instead of needing re-setting. */}
      <div className="text-format-size" data-tooltip="Line height">
        <AlignVerticalSpaceAround size={12} strokeWidth={1.7} className="text-format-lh-icon" />
        <input
          type="number"
          className="text-format-size-input"
          value={text.lineHeight ?? DEFAULT_LINE_HEIGHT}
          min={MIN_LINE_HEIGHT}
          max={MAX_LINE_HEIGHT}
          step={0.1}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (Number.isNaN(value)) return;
            patch({
              lineHeight: Math.min(MAX_LINE_HEIGHT, Math.max(MIN_LINE_HEIGHT, value)),
            });
          }}
          aria-label="Line height"
        />
      </div>

      {/* And beside that, the spacing between the letters — the other half of how loose
          the type is set. In em, so it holds its proportion when the size changes, the
          same way line height does. */}
      <div className="text-format-size" data-tooltip="Letter spacing">
        <AlignHorizontalSpaceAround size={12} strokeWidth={1.7} className="text-format-lh-icon" />
        <input
          type="number"
          className="text-format-size-input"
          value={text.letterSpacing ?? DEFAULT_LETTER_SPACING}
          min={MIN_LETTER_SPACING}
          max={MAX_LETTER_SPACING}
          step={0.01}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (Number.isNaN(value)) return;
            patch({
              letterSpacing: Math.min(MAX_LETTER_SPACING, Math.max(MIN_LETTER_SPACING, value)),
            });
          }}
          aria-label="Letter spacing"
        />
      </div>
    </>
  );
}

const ALIGNMENTS: { value: TextElement['align']; Icon: typeof AlignLeft; label: string }[] = [
  { value: 'left', Icon: AlignLeft, label: 'Align left' },
  { value: 'center', Icon: AlignCenter, label: 'Align centre' },
  { value: 'right', Icon: AlignRight, label: 'Align right' },
];
