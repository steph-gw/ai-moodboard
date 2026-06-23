import { Plus, Copy, Trash2 } from 'lucide-react';
import { useBoard } from '../context/BoardContext';

function SlideThumbnail({ slideId, index }: { slideId: string; index: number }) {
  const {
    board,
    activeSectionId,
    activeSlideId,
    setActiveSlideId,
    selectElement,
    getImageById: getImage,
  } = useBoard();

  const section = board.sections.find((s) => s.id === activeSectionId);
  const slide = section?.slides.find((s) => s.id === slideId);
  const isActive = activeSlideId === slideId;

  if (!slide) return null;

  const firstImage = slide.elements.find((el) => el.type === 'image');
  const thumbUrl =
    firstImage?.type === 'image'
      ? getImage(firstImage.imageId)?.url
      : undefined;

  return (
    <button
      type="button"
      className={`slide-tab ${isActive ? 'active' : ''}`}
      onClick={() => {
        setActiveSlideId(slideId);
        const imgEl = slide.elements.find((el) => el.type === 'image');
        if (imgEl) {
          selectElement(imgEl.id);
        } else {
          selectElement(null);
        }
      }}
    >
      <div className="slide-tab-preview">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" />
        ) : (
          <span className="slide-tab-number">{index + 1}</span>
        )}
      </div>
      <span className="slide-tab-label">{slide.name}</span>
    </button>
  );
}

export function SlideStrip() {
  const { board, activeSectionId, role, addSlide, deleteSlide, duplicateSlide, activeSlideId } =
    useBoard();
  const isPlanner = role === 'planner';

  const section = board.sections.find((s) => s.id === activeSectionId);
  if (!section) return null;

  return (
    <div className="slide-strip">
      <div className="slide-strip-scroll">
        {section.slides.map((slide, index) => (
          <SlideThumbnail key={slide.id} slideId={slide.id} index={index} />
        ))}
        {isPlanner && (
          <button type="button" className="slide-tab slide-tab-add" onClick={addSlide}>
            <Plus size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>
      {isPlanner && activeSlideId && section.slides.length > 1 && (
        <div className="slide-strip-actions">
          <button
            type="button"
            className="slide-action-btn"
            onClick={() => duplicateSlide(activeSlideId)}
            title="Duplicate slide"
          >
            <Copy size={13} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="slide-action-btn"
            onClick={() => deleteSlide(activeSlideId)}
            title="Delete slide"
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  );
}
