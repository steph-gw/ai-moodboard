import {
  Flower2,
  UtensilsCrossed,
  Leaf,
  Shirt,
  Mail,
  Plus,
} from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { countOpenPinThreads } from '../utils/commentHelpers';
import type { Section } from '../types';

const iconMap: Record<string, React.ReactNode> = {
  flower: <Flower2 size={14} strokeWidth={1.4} />,
  utensils: <UtensilsCrossed size={14} strokeWidth={1.4} />,
  leaf: <Leaf size={14} strokeWidth={1.4} />,
  shirt: <Shirt size={14} strokeWidth={1.4} />,
  mail: <Mail size={14} strokeWidth={1.4} />,
};

function StatusBadge({ section }: { section: Section }) {
  const openThreads = countOpenPinThreads(section.slides);

  switch (section.status) {
    case 'approved':
      return <span className="badge badge-approved">Approved</span>;
    case 'open':
      return (
        <span className="badge badge-open">
          {openThreads > 0 ? `${openThreads} threads` : 'Open'}
        </span>
      );
    case 'pending':
      return <span className="badge badge-pending">Pending</span>;
    default:
      return (
        <span className="badge badge-count">{section.imageCount}</span>
      );
  }
}

export function Sidebar() {
  const { board, role, activeSectionId, setActiveSectionId } = useBoard();
  const isPlanner = role === 'planner';

  return (
    <aside className="sidebar">
      <div className="sidebar-sections">
        <p className="sidebar-label">Sections</p>
        <ul className="section-list">
          {board.sections.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                className={`section-row ${activeSectionId === section.id ? 'active' : ''}`}
                onClick={() => setActiveSectionId(section.id)}
              >
                <span className="section-icon">
                  {iconMap[section.icon] ?? <Flower2 size={14} />}
                </span>
                <span className="section-name">{section.name}</span>
                <StatusBadge section={section} />
              </button>
            </li>
          ))}
        </ul>
        {isPlanner && (
          <button type="button" className="add-section-row">
            <Plus size={14} strokeWidth={1.5} />
            Add section
          </button>
        )}
      </div>
      <div className="board-palette">
        <p className="palette-label">Board palette</p>
        <div className="palette-swatches">
          {board.palette.map((color, i) => (
            <button
              key={i}
              type="button"
              className="palette-swatch"
              style={{ backgroundColor: color }}
              title={color}
              aria-label={`Palette color ${color}`}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
