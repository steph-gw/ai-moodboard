import { useEffect, useRef, useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { DraggableBox } from './DraggableBox';
import { ShapeView } from './ShapeView';
import type { CanvasElement, ImageElement, ShapeElement, TextElement } from '../types';
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
  const { selectedElementIds, selectElement, collapseSelectionTo, updateElement, getImageById, moveSelectionBy, beginInteraction, endInteraction } =
    useBoard();
  const isSelected = selectedElementIds.includes(element.id);
  // Resize and rotate handles belong to one element at a time. With several selected the
  // members get an outline and nothing to grab, so a handle never lies about what it moves.
  const isOnly = isSelected && selectedElementIds.length === 1;
  const image = getImageById(element.imageId);
  const hasVote = !!image?.clientVote;
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  // Selecting does not restack. Stacking is something the planner arranged — a palette
  // slide is a deliberate pile of shapes and labels — and raising whatever was last
  // clicked takes that apart a click at a time. Bring to front is on the toolbar for when
  // it is actually meant.
  const handleSelect = (additive: boolean) => selectElement(element.id, additive);

  return (
    <DraggableBox
      elementId={element.id}
      onInteractionStart={beginInteraction}
      onInteractionEnd={endInteraction}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      scale={scale}
      selected={isOnly}
      readOnly={readOnly}
      boundsWidth={SLIDE_WIDTH}
      boundsHeight={SLIDE_HEIGHT}
      minWidth={60}
      minHeight={45}
      className={`canvas-element-image ${hasVote ? 'has-vote' : ''} ${isSelected && !isOnly ? 'in-selection' : ''}`}
      style={{ zIndex: element.zIndex }}
      rotation={element.rotation}
      onSelect={handleSelect}
      onMoveBy={isSelected && !isOnly ? (dx, dy) => moveSelectionBy(slideId, dx, dy) : undefined}
      onClickWithoutDrag={(additive) => !additive && collapseSelectionTo(element.id)}
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
  const { selectedElementIds, selectElement, collapseSelectionTo, updateElement, moveSelectionBy, beginInteraction, endInteraction } =
    useBoard();
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const isSelected = selectedElementIds.includes(element.id);
  // Resize and rotate handles belong to one element at a time. With several selected the
  // members get an outline and nothing to grab, so a handle never lies about what it moves.
  const isOnly = isSelected && selectedElementIds.length === 1;
  const ref = useRef<HTMLDivElement>(null);
  const didAutoFocus = useRef(false);

  useEffect(() => {
    if (isOnly && !readOnly && !didAutoFocus.current && ref.current) {
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
  }, [isOnly, readOnly, element.content]);

  // Selecting does not restack. Stacking is something the planner arranged — a palette
  // slide is a deliberate pile of shapes and labels — and raising whatever was last
  // clicked takes that apart a click at a time. Bring to front is on the toolbar for when
  // it is actually meant.
  const handleSelect = (additive: boolean) => selectElement(element.id, additive);

  return (
    <DraggableBox
      elementId={element.id}
      onInteractionStart={beginInteraction}
      onInteractionEnd={endInteraction}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      scale={scale}
      selected={isOnly}
      readOnly={readOnly}
      boundsWidth={SLIDE_WIDTH}
      boundsHeight={SLIDE_HEIGHT}
      minWidth={80}
      minHeight={30}
      className={`canvas-element-text${isSelected && !isOnly ? ' in-selection' : ''}`}
      style={{ zIndex: element.zIndex }}
      rotation={element.rotation}
      onSelect={handleSelect}
      onMoveBy={isSelected && !isOnly ? (dx, dy) => moveSelectionBy(slideId, dx, dy) : undefined}
      onClickWithoutDrag={(additive) => !additive && collapseSelectionTo(element.id)}
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

  if (element.type === 'shape') {
    return (
      <ShapeElementView
        element={element}
        slideId={slideId}
        scale={scale}
        readOnly={frozen}
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

function ShapeElementView({
  element,
  slideId,
  scale,
  readOnly,
}: {
  element: ShapeElement;
  slideId: string;
  scale: number;
  readOnly?: boolean;
}) {
  const {
    selectedElementIds,
    selectElement,
    collapseSelectionTo,
    updateElement,
    moveSelectionBy,
    beginInteraction,
    endInteraction,
  } = useBoard();
  const isSelected = selectedElementIds.includes(element.id);
  // Resize and rotate handles belong to one element at a time. With several selected the
  // members get an outline and nothing to grab, so a handle never lies about what it moves.
  const isOnly = isSelected && selectedElementIds.length === 1;
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  return (
    <DraggableBox
      elementId={element.id}
      onInteractionStart={beginInteraction}
      onInteractionEnd={endInteraction}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      scale={scale}
      selected={isOnly}
      readOnly={readOnly}
      boundsWidth={SLIDE_WIDTH}
      boundsHeight={SLIDE_HEIGHT}
      minWidth={8}
      minHeight={8}
      className={`canvas-element-shape${isSelected && !isOnly ? ' in-selection' : ''}`}
      style={{ zIndex: element.zIndex }}
      rotation={element.rotation}
      onSelect={(additive) => selectElement(element.id, additive)}
      onMoveBy={isSelected && !isOnly ? (dx, dy) => moveSelectionBy(slideId, dx, dy) : undefined}
      onClickWithoutDrag={(additive) => !additive && collapseSelectionTo(element.id)}
      onChange={(patch) => updateElement(slideId, element.id, patch)}
      onContextMenu={(e) => {
        if (readOnly) return;
        e.preventDefault();
        selectElement(element.id);
        setMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <ShapeView element={element} />
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
