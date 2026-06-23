import { useBoard } from '../context/BoardContext';
import { SlideCanvas } from './SlideCanvas';
import { SlideStrip } from './SlideStrip';
import { CanvasToolbar } from './CanvasToolbar';
import { VisionBrief } from './VisionBrief';
import { countOpenPinThreads } from '../utils/commentHelpers';
import type { Section } from '../types';

function SectionHeader({ section }: { section: Section }) {
  const { board, role } = useBoard();
  const isPlanner = role === 'planner';

  const sectionImages = board.images.filter((img) => img.sectionId === section.id);
  const openThreads = countOpenPinThreads(section.slides);

  return (
    <div className="section-header">
      <div className="section-header-left">
        <h2 className="section-title">{section.name}</h2>
        <p className="section-meta">
          {sectionImages.length} image{sectionImages.length !== 1 ? 's' : ''}
          {section.slides.length > 0 &&
            ` · ${section.slides.length} slide${section.slides.length !== 1 ? 's' : ''}`}
          {openThreads > 0 &&
            ` · ${openThreads} open thread${openThreads !== 1 ? 's' : ''}`}
        </p>
      </div>
      <div className="section-header-right">
        {section.status === 'approved' ? (
          <span className="approved-badge">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Approved {section.approvedDate}
          </span>
        ) : isPlanner ? (
          <button type="button" className="btn-ghost btn-sm">
            Request approval
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function MainCanvas() {
  const { board, activeSectionId } = useBoard();

  const activeSection = board.sections.find((s) => s.id === activeSectionId);
  if (!activeSection) return null;

  return (
    <main className="canvas">
      <VisionBrief />

      <SectionHeader section={activeSection} />

      <SlideStrip />

      <CanvasToolbar />

      <SlideCanvas fullWidth />
    </main>
  );
}
