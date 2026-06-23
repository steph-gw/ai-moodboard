import { useRef } from 'react';
import { useBoard } from '../context/BoardContext';

export function VisionBrief() {
  const { visionBrief, updateVisionBrief, role } = useBoard();
  const ref = useRef<HTMLParagraphElement>(null);
  const isPlanner = role === 'planner';

  return (
    <div className="vision-brief">
      <p className="vision-brief-label">Vision brief</p>
      {isPlanner ? (
        <p
          ref={ref}
          className="vision-brief-text vision-brief-editable"
          contentEditable
          suppressContentEditableWarning
          onBlur={() => {
            if (ref.current) updateVisionBrief(ref.current.innerText);
          }}
        >
          {visionBrief}
        </p>
      ) : (
        <p className="vision-brief-text">{visionBrief}</p>
      )}
    </div>
  );
}
