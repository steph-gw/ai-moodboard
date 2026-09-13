import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { DraggableBox } from './DraggableBox';
import { ShapeView } from './ShapeView';
import { PaletteGroupView, SwatchView } from './SwatchView';
import type {
  CanvasElement,
  ImageElement,
  PaletteGroupElement,
  ShapeElement,
  SwatchElement,
  TextElement,
} from '../types';
import { SLIDE_HEIGHT, SLIDE_WIDTH, DEFAULT_LINE_HEIGHT } from '../types';
import { letterSpacingCss } from '../utils/textFonts';

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

/**
 * The read-only face of a vote, for present mode.
 *
 * Present is where the planner walks the client through the board, so a decision already
 * taken should be visible — but nothing there is clickable, and the export sheet renders
 * its own elements entirely, so a PDF never picks this up.
 */
function ImageVoteBadge({ imageId }: { imageId: string }) {
  const { getImageById } = useBoard();
  const vote = getImageById(imageId)?.clientVote;
  if (!vote) return null;

  return (
    <div className={`image-vote-badge ${vote}`} aria-hidden>
      {vote === 'up' ? (
        <ThumbsUp size={13} strokeWidth={1.6} fill="currentColor" />
      ) : (
        <ThumbsDown size={13} strokeWidth={1.6} fill="currentColor" />
      )}
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
        {isStatic ? (
          <ImageVoteBadge imageId={element.imageId} />
        ) : (
          <ImageVoteControls imageId={element.imageId} />
        )}
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
  const {
    selectedElementIds,
    selectElement,
    collapseSelectionTo,
    updateElement,
    moveSelectionBy,
    beginInteraction,
    endInteraction,
    justAddedTextId,
    clearJustAddedText,
  } = useBoard();
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const isSelected = selectedElementIds.includes(element.id);
  // Resize and rotate handles belong to one element at a time. With several selected the
  // members get an outline and nothing to grab, so a handle never lies about what it moves.
  const isOnly = isSelected && selectedElementIds.length === 1;
  const ref = useRef<HTMLDivElement>(null);
  const didAutoFocus = useRef(false);
  /**
   * The height the text needs while it is being typed.
   *
   * Local, not committed: the box has to grow under the cursor, and writing a height on
   * every keystroke would be an undo entry and a save per character. It is written once,
   * with the content, when the field is left.
   */
  const [liveHeight, setLiveHeight] = useState<number | null>(null);

  /**
   * What the content actually occupies, in slide units.
   *
   * Measured with the box released to `auto` first. The inner is a flex container sized to
   * the element, and asking a constrained flex box for its scrollHeight reports the squeeze
   * rather than the content — which is why the box grew part of the way and stopped.
   */
  const measure = () => {
    const node = ref.current;
    if (!node) return null;
    const prev = node.style.height;
    node.style.height = 'auto';
    const content = node.scrollHeight;
    node.style.height = prev;
    return Math.min(SLIDE_HEIGHT, Math.max(30, Math.ceil(content / scale)));
  };

  /**
   * Keeps the box the size of the text in it.
   *
   * Both directions, not just growth: a box left taller than its text made the selection
   * ring appear at one size and settle at another the moment it was let go, which reads as
   * the editor changing its mind. The ring is meant to show what you have hold of.
   *
   * Only while this element is the selection — the user is working on it, so a board that
   * nobody has touched is never rewritten on open.
   */
  useLayoutEffect(() => {
    if (editing || readOnly || !isOnly) return;
    const needed = measure();
    if (needed && Math.abs(needed - element.height) > 1) {
      updateElement(slideId, element.id, { height: needed });
    }
  });

  /**
   * Turns editing on and puts the caret in the box.
   *
   * Setting the flag alone was not enough: contentEditable only appears on the next render,
   * and without focus the browser refuses to start a selection inside it — so a drag across
   * the words did nothing at all. Focusing on the following frame is what makes the text
   * selectable by dragging, which is the whole point of double-clicking it.
   */
  const beginEditing = () => {
    if (readOnly) return;
    setEditing(true);
    requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }));
  };

  /**
   * Editing ends when the box stops being the selection.
   *
   * It used to end only on blur, so a box opened for typing and then left alone — clicking
   * the canvas rather than into another field — stayed contenteditable indefinitely. That
   * is the state where a drag across the words moves the caret instead of the box, which
   * is what made text feel stuck.
   */
  useEffect(() => {
    if (!isOnly && editing) setEditing(false);
  }, [isOnly, editing]);

  /**
   * A box that was just added opens for typing; an existing one waits for a double-click.
   *
   * Selecting used to start editing, which put every text box into a mode where a drag
   * moved the caret instead of the box — so text was hard to move, and the words were hard
   * to highlight because the drag was being swallowed either way. One click selects and
   * drags now, two clicks edit, which is what every other canvas tool does.
   */
  useEffect(() => {
    if (readOnly || didAutoFocus.current || justAddedTextId !== element.id || !ref.current) {
      return;
    }
    didAutoFocus.current = true;
    clearJustAddedText();
    setEditing(true);
    requestAnimationFrame(() => {
      ref.current?.focus();
      // The placeholder is selected so the first keystroke replaces it.
      const range = document.createRange();
      range.selectNodeContents(ref.current!);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  }, [justAddedTextId, element.id, readOnly, clearJustAddedText]);

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
      height={liveHeight ?? element.height}
      scale={scale}
      selected={isOnly}
      readOnly={readOnly}
      boundsWidth={SLIDE_WIDTH}
      boundsHeight={SLIDE_HEIGHT}
      minWidth={80}
      minHeight={30}
      className={`canvas-element-text${isSelected && !isOnly ? ' in-selection' : ''}${
        editing ? ' is-editing' : ''
      }`}
      style={{ zIndex: element.zIndex }}
      rotation={element.rotation}
      onSelect={handleSelect}
      onMoveBy={isSelected && !isOnly ? (dx, dy) => moveSelectionBy(slideId, dx, dy) : undefined}
      onClickWithoutDrag={(additive) => !additive && collapseSelectionTo(element.id)}
      onChange={(patch) => updateElement(slideId, element.id, patch)}
      onDoubleClick={() => beginEditing()}
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
          lineHeight: element.lineHeight ?? DEFAULT_LINE_HEIGHT,
          letterSpacing: letterSpacingCss(element.letterSpacing),
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
        onInput={() => {
          const needed = measure();
          if (needed !== null) setLiveHeight(needed);
        }}
        onBlur={() => {
          if (ref.current) {
            const needed = measure();
            updateElement(slideId, element.id, {
              content: ref.current.innerText,
              // Committed with the text, in one entry: the box and what is in it changed
              // together and should be undone together.
              ...(needed !== null && needed !== element.height ? { height: needed } : {}),
            });
          }
          setLiveHeight(null);
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

  if (element.type === 'shape' || element.type === 'swatch' || element.type === 'paletteGroup') {
    return (
      <BoxElementView
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

/**
 * Shapes and swatches: the same box with different contents.
 *
 * They behave identically — drag, resize, rotate, right-click — so they share one wrapper.
 * Only what is painted inside differs, which is the whole of the difference between them.
 */
function BoxElementView({
  element,
  slideId,
  scale,
  readOnly,
}: {
  element: ShapeElement | SwatchElement | PaletteGroupElement;
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
      {element.type === 'swatch' ? (
        <SwatchView element={element} scale={scale} />
      ) : element.type === 'paletteGroup' ? (
        <PaletteGroupView element={element} scale={scale} />
      ) : (
        <ShapeView element={element} />
      )}
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
