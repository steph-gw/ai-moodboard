import { useCallback, useState } from 'react';
import { useBoard } from '../context/BoardContext';
import { SlideCanvas } from './SlideCanvas';
import { ElementToolbar } from './ElementToolbar';
import { SlideActions } from './SlideActions';
import { CanvasToolbar } from './CanvasToolbar';
import { VisionBrief } from './VisionBrief';
import { SectionStatusSelect } from './SectionStatusSelect';
import { TextFormatFloat } from './TextFormatFloat';
import { PaletteEditor } from './PaletteEditor';
import { ColorField } from './ColorField';
import type { Section } from '../types';
import { useHost } from '../embed/HostProvider';

/**
 * Just the status. The section name is already the selected tab directly above this row,
 * and repeating it cost the row width that the text controls now use.
 */
function SectionMeta({ section }: { section: Section }) {
  const { features } = useHost();
  return (
    <div className="canvas-bar-left">
      <VisionBrief />
      {features.legacyPalette && <PaletteEditor />}
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
          {/* Text formatting has left this row for a bar on the slide itself — see
              TextFormatFloat. What stays is the slide's own background, which is small
              and only appears when the slide, not an element, is selected. */}
          {activeSlideId && !selectedText && isSlideSelected && canEdit && (
            <div className="canvas-bar-mid">
              <span className="shape-format-label">Background</span>
              <ColorField
                label="Slide background"
                value={activeSlide?.background ?? 'transparent'}
                onChange={(background) => setSlideBackground(activeSlideId, background)}
                allowNone
                onNone={() => setSlideBackground(activeSlideId, undefined)}
              />
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
        {/* The lock badge lives in SlideActions, top right — one padlock, not two. */}
        {activeSlideId && selectedText && canEdit && (
          <TextFormatFloat
            element={selectedText as Extract<typeof selectedText, { type: 'text' }>}
            slideId={activeSlideId}
            applyToIds={selectedTexts.map((el) => el.id)}
            count={selectedTexts.length}
          />
        )}
        <ElementToolbar />
        <SlideActions />
        <SlideCanvas fullWidth fitMode="contain" onWidthChange={onWidthChange} />
      </div>
    </main>
  );
}
