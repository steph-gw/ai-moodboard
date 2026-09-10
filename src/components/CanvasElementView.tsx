import { useEffect, useRef, useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { DraggableBox } from './DraggableBox';
import type { CanvasElement, ImageElement, TextElement } from '../types';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../types';
import { textFontCss } from '../utils/textFonts';
import { ElementContextMenu } from './ElementContextMenu';

interface CanvasElementViewProps {
  element: CanvasElement;
  slideId: string;
  scale: number;
  readOnly?: boolean;
}

function ImageVoteControls({ imageId }: { imageId: string }) {
  const { getImageById, voteImage } = useBoard();
  const image = getImageById(imageId);
  if (!image) return null;

  const vote = image.clientVote;

  return (
    <div className={`image-vote-controls ${vote ? 'has-vote' : ''}`}>
      <button
        type="button"
        className={`image-vote-btn ${vote === 'up' ? 'active up' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          voteImage(imageId, 'up');
        }}
        aria-label="Thumbs up"
        aria-pressed={vote === 'up'}
      >
        <ThumbsUp size={13} strokeWidth={1.6} fill={vote === 'up' ? 'currentColor' : 'none'} />
      </button>
      <button
        type="button"
        className={`image-vote-btn ${vote === 'down' ? 'active down' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          voteImage(imageId, 'down');
        }}
        aria-label="Thumbs down"
        aria-pressed={vote === 'down'}
      >
        <ThumbsDown size={13} strokeWidth={1.6} fill={vote === 'down' ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

function ImageElementView({
  element,
  slideId,
  scale,
  imageUrl,
  readOnly,
  isStatic,
}: {
  element: ImageElement;
  slideId: string;
  scale: number;
  imageUrl: string;
  /** This viewer may not change the board — a client, or a locked slide. */
  readOnly?: boolean;
  /** Present mode or the export sheet: nothing interactive, votes included. */
  isStatic?: boolean;
}) {
  const { selectedElementId, selectElement, updateElement, getImageById, bringToFront, beginInteraction, endInteraction } =
    useBoard();
  const isSelected = selectedElementId === element.id;
  const image = getImageById(element.imageId);
  const hasVote = !!image?.clientVote;
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const handleSelect = () => {
    selectElement(element.id);
    // Raise it, but through restack rather than a timestamp: clicking an element that
    // is already on top is not an edit, and shouldn't cost an undo entry or a save.
    if (!readOnly) bringToFront(slideId, element.id);
  };

  return (
    <DraggableBox
      onInteractionStart={beginInteraction}
      onInteractionEnd={endInteraction}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      scale={scale}
      selected={isSelected}
      readOnly={readOnly}
      boundsWidth={SLIDE_WIDTH}
      boundsHeight={SLIDE_HEIGHT}
      minWidth={60}
      minHeight={45}
      className={`canvas-element-image ${hasVote ? 'has-vote' : ''}`}
      style={{ zIndex: element.zIndex }}
      rotation={element.rotation}
      onSelect={handleSelect}
      onChange={(patch) => updateElement(slideId, element.id, patch)}
      onContextMenu={(e) => {
        if (readOnly) return;
        e.preventDefault();
        selectElement(element.id);
        setMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <div className="canvas-image-inner">
        <img src={imageUrl} alt="" draggable={false} />
        {!isStatic && <ImageVoteControls imageId={element.imageId} />}
      </div>
      {menu && (
        <ElementContextMenu
          slideId={slideId}
          elementId={element.id}
          imageUrl={imageUrl}
          at={menu}
          onClose={() => setMenu(null)}
        />
      )}
    </DraggableBox>
  );
}

function TextElementView({
  element,
  slideId,
  scale,
  readOnly,
}: {
  element: TextElement;
  slideId: string;
  scale: number;
  readOnly?: boolean;
}) {
  const { selectedElementId, selectElement, updateElement, bringToFront, beginInteraction, endInteraction } =
    useBoard();
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const isSelected = selectedElementId === element.id;
  const ref = useRef<HTMLDivElement>(null);
  const didAutoFocus = useRef(false);

  useEffect(() => {
    if (isSelected && !readOnly && !didAutoFocus.current && ref.current) {
      didAutoFocus.current = true;
      setEditing(true);
      requestAnimationFrame(() => {
        ref.current?.focus();
        if (element.content === 'Heading') {
          const range = document.createRange();
          range.selectNodeContents(ref.current!);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      });
    }
  }, [isSelected, readOnly, element.content]);

  const handleSelect = () => {
    selectElement(element.id);
    // Raise it, but through restack rather than a timestamp: clicking an element that
    // is already on top is not an edit, and shouldn't cost an undo entry or a save.
    if (!readOnly) bringToFront(slideId, element.id);
  };

  return (
    <DraggableBox
      onInteractionStart={beginInteraction}
      onInteractionEnd={endInteraction}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      scale={scale}
      selected={isSelected}
      readOnly={readOnly}
      boundsWidth={SLIDE_WIDTH}
      boundsHeight={SLIDE_HEIGHT}
      minWidth={80}
      minHeight={30}
      className="canvas-element-text"
      style={{ zIndex: element.zIndex }}
      rotation={element.rotation}
      onSelect={handleSelect}
      onChange={(patch) => updateElement(slideId, element.id, patch)}
      onDoubleClick={() => !readOnly && setEditing(true)}
      onContextMenu={(e) => {
        if (readOnly) return;
        e.preventDefault();
        selectElement(element.id);
        setMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <div
        ref={ref}
        className="canvas-text-inner"
        contentEditable={!readOnly && editing}
        suppressContentEditableWarning
        style={{
          fontSize: element.fontSize * scale,
          fontFamily: textFontCss(element.fontFamily),
          fontWeight: element.bold ? 700 : 400,
          fontStyle: element.italic ? 'italic' : 'normal',
          color: element.color,
          textAlign: element.align,
          justifyContent:
            element.align === 'left'
              ? 'flex-start'
              : element.align === 'right'
                ? 'flex-end'
                : 'center',
          whiteSpace: 'pre-wrap',
        }}
        onBlur={() => {
          if (ref.current) {
            updateElement(slideId, element.id, {
              content: ref.current.innerText,
            });
          }
          setEditing(false);
        }}
        onFocus={() => !readOnly && setEditing(true)}
        onPointerDown={(e) => editing && e.stopPropagation()}
      >
        {element.content}
      </div>
      {menu && (
        <ElementContextMenu
          slideId={slideId}
          elementId={element.id}
          at={menu}
          onClose={() => setMenu(null)}
        />
      )}
    </DraggableBox>
  );
}

export function CanvasElementView({
  element,
  slideId,
  scale,
  readOnly,
}: CanvasElementViewProps) {
  const { getImageById, canEdit } = useBoard();

  // Two different noes. `readOnly` here means a static render — present mode and the export
  // sheet — where nothing should be interactive at all. `canEdit` means this viewer may not
  // change the board: a client, or a slide the planner has locked. They differ over voting,
  // which is the client's whole job and must survive the second but not the first.
  const frozen = readOnly || !canEdit;

  if (element.type === 'image') {
    const image = getImageById(element.imageId);
    if (!image) return null;
    return (
      <ImageElementView
        element={element}
        slideId={slideId}
        scale={scale}
        readOnly={frozen}
        isStatic={readOnly ?? false}
        imageUrl={image.url}
      />
    );
  }

  return (
    <TextElementView
      element={element}
      slideId={slideId}
      scale={scale}
      readOnly={frozen}
    />
  );
}
