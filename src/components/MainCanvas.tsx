import { useBoard } from '../context/BoardContext';
import { SlideCanvas } from './SlideCanvas';
import { CanvasToolbar } from './CanvasToolbar';
import { TextFormatBar } from './TextFormatBar';
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
  const { board, activeSectionId, activeSlide, selectedElementId } = useBoard();

  const activeSection = board.sections.find((s) => s.id === activeSectionId);
  if (!activeSection) return null;

  const selectedIsText =
    activeSlide?.elements.find((el) => el.id === selectedElementId)?.type === 'text';

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
        {selectedIsText && <TextFormatBar />}
      </div>

      <div className="canvas-stage">
        <SlideCanvas fullWidth fitMode="contain" />
      </div>
    </main>
  );
}
