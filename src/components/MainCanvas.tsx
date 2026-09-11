import { useCallback, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { SlideCanvas } from './SlideCanvas';
import { ElementToolbar } from './ElementToolbar';
import { SlideActions } from './SlideActions';
import { CanvasToolbar } from './CanvasToolbar';
import { VisionBrief } from './VisionBrief';
import { SectionStatusSelect } from './SectionStatusSelect';
import { TextFormatControls } from './TextFormatBar';
import { PaletteEditor } from './PaletteEditor';
import { ColorField } from './ColorField';
import type { Section } from '../types';

/**
 * Just the status. The section name is already the selected tab directly above this row,
 * and repeating it cost the row width that the text controls now use.
 */
function SectionMeta({ section }: { section: Section }) {
  return (
    <div className="canvas-bar-left">
      <VisionBrief />
      <PaletteEditor />
      <SectionStatusSelect section={section} />
    </div>
  );
}

export function MainCanvas() {
  const {
    board,
    activeSectionId,
    activeSlide,
    activeSlideId,
    selectedElementIds,
    lockedSlideIds,
    canEdit,
    isSlideSelected,
    setSlideBackground,
  } = useBoard();
  // The header lines up with the slide rather than the window, so the two read as one
  // object. The artboard is the only thing that knows its own rendered width.
  const [artboardWidth, setArtboardWidth] = useState<number | null>(null);
  const onWidthChange = useCallback((w: number) => setArtboardWidth(w), []);

  const activeSection = board.sections.find((s) => s.id === activeSectionId);
  if (!activeSection) return null;

  // Text controls apply to the whole selection when it is all text — changing the color of
  // five headings should be one action, not five.
  const selectedTexts = (activeSlide?.elements ?? []).filter(
    (el) => selectedElementIds.includes(el.id) && el.type === 'text'
  );
  const allText = selectedTexts.length > 0 && selectedTexts.length === selectedElementIds.length;
  const selectedText = allText ? selectedTexts[selectedTexts.length - 1] : undefined;
  // Two ways a slide stops taking edits, and they need different words on the badge:
  // a lock is one slide someone froze on purpose, approval freezes the whole section and
  // is lifted by setting the status back rather than by unlocking anything.
  const locked = lockedSlideIds.has(activeSlideId);
  const approved = activeSection.status === 'approved';

  return (
    <main className="canvas">
      {/* Everything above the stage is fixed height so the artboard can take
          the rest of the viewport without the page ever scrolling. */}
      <div className="canvas-head">
        <div
          className="canvas-bar"
          style={artboardWidth ? { width: artboardWidth } : undefined}
        >
          <SectionMeta section={activeSection} />
          {/* Text formatting rides in this row rather than a bar of its own: the row is
              already here, so using it costs the artboard no height. */}
          {activeSlideId && (selectedText || (isSlideSelected && canEdit)) && (
            <div className="canvas-bar-mid">
              {selectedText ? (
                <>
                  {selectedTexts.length > 1 && (
                    <span className="toolbar-count">{selectedTexts.length} selected</span>
                  )}
                  <TextFormatControls
                    element={selectedText as Extract<typeof selectedText, { type: 'text' }>}
                    slideId={activeSlideId}
                    applyToIds={selectedTexts.map((el) => el.id)}
                  />
                </>
              ) : (
                // Only once the slide has actually been clicked — see isSlideSelected.
                <>
                  <span className="shape-format-label">Background</span>
                  <ColorField
                    label="Slide background"
                    value={activeSlide?.background ?? 'transparent'}
                    onChange={(background) => setSlideBackground(activeSlideId, background)}
                    allowNone
                    onNone={() => setSlideBackground(activeSlideId, undefined)}
                  />
                </>
              )}
            </div>
          )}
          <div className="canvas-bar-right">
            <CanvasToolbar />
          </div>
        </div>
      </div>

      {/* Both overlays float above the artboard rather than sitting in the header. The
          artboard scales to its container, so anything that appears in the layout above it
          shrinks the slide — which is what selecting a text box used to do. */}
      <div className="canvas-stage">
        {/* On the slide itself, where someone wondering why they can't edit is looking. */}
        {(locked || approved) && (
          <span
            className="canvas-lock"
            data-tooltip={
              locked
                ? 'This slide is locked'
                : 'This section is approved — set it back to Open to edit'
            }
            tabIndex={0}
          >
            {locked ? <Lock size={15} strokeWidth={2} /> : <Check size={15} strokeWidth={2.4} />}
          </span>
        )}
        <ElementToolbar />
        <SlideActions />
        <SlideCanvas fullWidth fitMode="contain" onWidthChange={onWidthChange} />
      </div>
    </main>
  );
}
