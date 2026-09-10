import { useCallback, useState } from 'react';
import { Lock } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { SlideCanvas } from './SlideCanvas';
import { ElementToolbar } from './ElementToolbar';
import { SlideActions } from './SlideActions';
import { CanvasToolbar } from './CanvasToolbar';
import { VisionBrief } from './VisionBrief';
import { SectionStatusSelect } from './SectionStatusSelect';
import { TextFormatControls } from './TextFormatBar';
import type { Section } from '../types';

/**
 * Just the status. The section name is already the selected tab directly above this row,
 * and repeating it cost the row width that the text controls now use.
 */
function SectionMeta({ section }: { section: Section }) {
  return (
    <div className="canvas-bar-left">
      <SectionStatusSelect section={section} />
    </div>
  );
}

export function MainCanvas() {
  const { board, activeSectionId, activeSlide, activeSlideId, selectedElementId, lockedSlideIds } =
    useBoard();
  // The header lines up with the slide rather than the window, so the two read as one
  // object. The artboard is the only thing that knows its own rendered width.
  const [artboardWidth, setArtboardWidth] = useState<number | null>(null);
  const onWidthChange = useCallback((w: number) => setArtboardWidth(w), []);

  const activeSection = board.sections.find((s) => s.id === activeSectionId);
  if (!activeSection) return null;

  const selectedText = activeSlide?.elements.find(
    (el) => el.id === selectedElementId && el.type === 'text'
  );
  const locked = lockedSlideIds.has(activeSlideId);

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
          {selectedText && activeSlideId && (
            <div className="canvas-bar-mid">
              <TextFormatControls
                element={selectedText as Extract<typeof selectedText, { type: 'text' }>}
                slideId={activeSlideId}
              />
            </div>
          )}
          <div className="canvas-bar-right">
            <VisionBrief />
            <CanvasToolbar />
          </div>
        </div>
      </div>

      {/* Both overlays float above the artboard rather than sitting in the header. The
          artboard scales to its container, so anything that appears in the layout above it
          shrinks the slide — which is what selecting a text box used to do. */}
      <div className="canvas-stage">
        {/* On the slide itself, where someone wondering why they can't edit is looking. */}
        {locked && (
          <span className="canvas-lock" data-tooltip="This slide is locked" tabIndex={0}>
            <Lock size={15} strokeWidth={2} />
          </span>
        )}
        <ElementToolbar />
        <SlideActions />
        <SlideCanvas fullWidth fitMode="contain" onWidthChange={onWidthChange} />
      </div>
    </main>
  );
}
