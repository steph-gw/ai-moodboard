import { useBoard } from '../context/BoardContext';
import { SlideCanvas } from './SlideCanvas';
import { ElementToolbar } from './ElementToolbar';
import { SlideActions } from './SlideActions';
import { CanvasToolbar } from './CanvasToolbar';
import { VisionBrief } from './VisionBrief';
import { SectionStatusSelect } from './SectionStatusSelect';
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
  const { board, activeSectionId } = useBoard();

  const activeSection = board.sections.find((s) => s.id === activeSectionId);
  if (!activeSection) return null;

  return (
    <main className="canvas">
      {/* Everything above the stage is fixed height so the artboard can take
          the rest of the viewport without the page ever scrolling. */}
      <div className="canvas-head">
        <VisionBrief />
        <div className="canvas-bar">
          <SectionMeta section={activeSection} />
          <CanvasToolbar />
        </div>
      </div>

      {/* Both overlays float above the artboard rather than sitting in the header. The
          artboard scales to its container, so anything that appears in the layout above it
          shrinks the slide — which is what selecting a text box used to do. */}
      <div className="canvas-stage">
        <ElementToolbar />
        <SlideActions />
        <SlideCanvas fullWidth fitMode="contain" />
      </div>
    </main>
  );
}
