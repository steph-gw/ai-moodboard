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
import { countOpenPinThreads } from '../utils/commentHelpers';
import type { Section } from '../types';

function SectionMeta({ section }: { section: Section }) {
  const { board } = useBoard();

  const sectionImages = board.images.filter((img) => img.sectionId === section.id);
  const openThreads = countOpenPinThreads(section.slides);

  return (
    <div className="canvas-bar-left">
      <h2 className="section-title">{section.name}</h2>
      <SectionStatusSelect section={section} />
      <p className="section-meta">
        {sectionImages.length} image{sectionImages.length !== 1 ? 's' : ''}
        {section.slides.length > 0 &&
          ` · ${section.slides.length} slide${section.slides.length !== 1 ? 's' : ''}`}
        {openThreads > 0 &&
          ` · ${openThreads} open thread${openThreads !== 1 ? 's' : ''}`}
      </p>
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
            {locked && (
              <span className="locked-chip" title="This slide is locked">
                <Lock size={11} strokeWidth={1.8} />
                Locked
              </span>
            )}
            <VisionBrief />
            <CanvasToolbar />
          </div>
        </div>
      </div>

      {/* Both overlays float above the artboard rather than sitting in the header. The
          artboard scales to its container, so anything that appears in the layout above it
          shrinks the slide — which is what selecting a text box used to do. */}
      <div className="canvas-stage">
        <ElementToolbar />
        <SlideActions />
        <SlideCanvas fullWidth fitMode="contain" onWidthChange={onWidthChange} />
      </div>
    </main>
  );
}
