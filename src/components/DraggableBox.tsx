import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { RotateCw } from 'lucide-react';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type DragMode = 'move' | 'rotate' | ResizeHandle;

interface BoxPatch {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
}

interface DraggableBoxProps {
  /** Lets the floating toolbar find this box's rendered position. */
  elementId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scale: number;
  selected: boolean;
  readOnly?: boolean;
  minWidth?: number;
  minHeight?: number;
  boundsWidth: number;
  boundsHeight: number;
  className?: string;
  style?: React.CSSProperties;
  onSelect: (additive: boolean) => void;
  /**
   * Takes over a move when several elements are selected, receiving the pointer delta in
   * slide units rather than a new box — the group is positioned and clamped as a whole.
   */
  onMoveBy?: (dx: number, dy: number) => void;
  /** The press turned out to be a click rather than a drag. */
  onClickWithoutDrag?: (additive: boolean) => void;
  onChange: (patch: BoxPatch) => void;
  /** Called once at pointerdown and once at pointerup, so a whole drag is one undo step. */
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  children: ReactNode;
}

const HANDLES: { handle: ResizeHandle; className: string }[] = [
  { handle: 'nw', className: 'resize-nw' },
  { handle: 'n', className: 'resize-n' },
  { handle: 'ne', className: 'resize-ne' },
  { handle: 'e', className: 'resize-e' },
  { handle: 'se', className: 'resize-se' },
  { handle: 's', className: 'resize-s' },
  { handle: 'sw', className: 'resize-sw' },
  { handle: 'w', className: 'resize-w' },
];

/** Snap increment (degrees) while rotating with Shift held. */
const ROTATE_SNAP = 15;
/** Arm plus handle, in screen px. Below this there isn't room above the box. */
const ROTATE_HANDLE_CLEARANCE = 40;
/** Screen px of travel before a press counts as a drag rather than a click. */
const CLICK_SLOP = 3;

export function DraggableBox({
  x,
  y,
  width,
  height,
  rotation = 0,
  scale,
  selected,
  readOnly = false,
  minWidth = 40,
  minHeight = 30,
  boundsWidth,
  boundsHeight,
  className = '',
  style,
  onSelect,
  onMoveBy,
  onClickWithoutDrag,
  elementId,
  onChange,
  onInteractionStart,
  onInteractionEnd,
  onDoubleClick,
  onContextMenu,
  children,
}: DraggableBoxProps) {
  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    origRotation: number;
    centerX: number;
    centerY: number;
    startAngle: number;
    moved: boolean;
  } | null>(null);

  const clamp = useCallback(
    (nx: number, ny: number, nw: number, nh: number) => {
      const w = Math.max(minWidth, Math.min(nw, boundsWidth));
      const h = Math.max(minHeight, Math.min(nh, boundsHeight));
      const cx = Math.max(0, Math.min(nx, boundsWidth - w));
      const cy = Math.max(0, Math.min(ny, boundsHeight - h));
      return { x: cx, y: cy, width: w, height: h };
    },
    [minWidth, minHeight, boundsWidth, boundsHeight]
  );

  const applyResize = useCallback(
    (mode: ResizeHandle, dx: number, dy: number, origX: number, origY: number, origW: number, origH: number) => {
      let nx = origX;
      let ny = origY;
      let nw = origW;
      let nh = origH;

      if (mode.includes('e')) nw = origW + dx;
      if (mode.includes('w')) {
        nw = origW - dx;
        nx = origX + dx;
      }
      if (mode.includes('s')) nh = origH + dy;
      if (mode.includes('n')) {
        nh = origH - dy;
        ny = origY + dy;
      }

      return clamp(nx, ny, nw, nh);
    },
    [clamp]
  );

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.mode === 'rotate') {
        const angle =
          (Math.atan2(e.clientY - drag.centerY, e.clientX - drag.centerX) * 180) / Math.PI;
        let next = drag.origRotation + (angle - drag.startAngle);
        if (e.shiftKey) next = Math.round(next / ROTATE_SNAP) * ROTATE_SNAP;
        // Keep it in (-180, 180] so the readout stays legible.
        next = ((((next + 180) % 360) + 360) % 360) - 180;
        onChange({ rotation: Math.round(next) });
        return;
      }

      const dx = (e.clientX - drag.startX) / scale;
      const dy = (e.clientY - drag.startY) / scale;

      if (drag.mode === 'move') {
        if (Math.abs(dx * scale) > CLICK_SLOP || Math.abs(dy * scale) > CLICK_SLOP) {
          drag.moved = true;
        }
        if (onMoveBy) onMoveBy(dx, dy);
        else onChange(clamp(drag.origX + dx, drag.origY + dy, drag.origW, drag.origH));
        return;
      }

      // Handles rotate with the box, so bring the pointer delta back into the
      // element's own axes before resizing.
      const rad = (-drag.origRotation * Math.PI) / 180;
      const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);

      onChange(
        applyResize(drag.mode, localDx, localDy, drag.origX, drag.origY, drag.origW, drag.origH)
      );
    };

    const onPointerUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (drag) {
        onInteractionEnd?.();
        if (drag.mode === 'move' && !drag.moved) {
          onClickWithoutDrag?.(e.metaKey || e.ctrlKey);
        }
      }
      dragRef.current = null;
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [scale, clamp, applyResize, onChange, onMoveBy, onClickWithoutDrag, onInteractionEnd]);

  // The rotate handle sits above the box, and the canvas stage clips anything that
  // escapes the artboard — so for a box near the top it would be invisible and
  // unusable. Flip it underneath instead.
  const rotateBelow = y * scale < ROTATE_HANDLE_CLEARANCE;

  /**
   * Where the selection ring and handles are drawn.
   *
   * A layer above every element rather than inside this one. Handles drawn inside their
   * own element are painted over by anything stacked above it — the rotate handle under a
   * color chip vanished behind the label beneath it. Lifting the element instead fixed the
   * handles but restacked the slide on every click, which is a change to what you see for
   * the sake of what you can grab.
   */
  const boxRef = useRef<HTMLDivElement>(null);
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const found = boxRef.current?.closest('.slide-artboard')?.querySelector('.selection-layer');
    setLayer(found instanceof HTMLElement ? found : null);
  }, []);

  const startDrag = (e: ReactPointerEvent, mode: DragMode) => {
    if (readOnly) return;
    e.stopPropagation();
    e.preventDefault();
    // Opened before onSelect so the raise-to-front that selection triggers folds into
    // the same undo step as the drag itself. One gesture, one entry.
    onInteractionStart?.();
    // Cmd on a Mac, Ctrl elsewhere — whichever the platform uses for "add to a selection".
    onSelect(e.metaKey || e.ctrlKey);

    // The chrome is portalled out of the element, so a handle's nearest box may be either.
    // Both carry the same rect, so the rotation centre is the same from either one.
    const box = (e.currentTarget as HTMLElement).closest('.canvas-element, .selection-chrome');
    const rect = box?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : e.clientX;
    const centerY = rect ? rect.top + rect.height / 2 : e.clientY;

    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: x,
      origY: y,
      origW: width,
      origH: height,
      origRotation: rotation,
      centerX,
      centerY,
      startAngle: (Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180) / Math.PI,
      moved: false,
    };
  };

  const box = (
    <div
      ref={boxRef}
      data-el-id={elementId}
      className={`canvas-element ${className} ${selected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        left: x * scale,
        top: y * scale,
        width: width * scale,
        height: height * scale,
        zIndex: style?.zIndex,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
      }}
      onPointerDown={(e) => !readOnly && startDrag(e, 'move')}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {children}
    </div>
  );

  const chrome =
    selected && !readOnly && layer
      ? createPortal(
          <div
            className="selection-chrome"
            style={{
              left: x * scale,
              top: y * scale,
              width: width * scale,
              height: height * scale,
              transform: rotation ? `rotate(${rotation}deg)` : undefined,
            }}
          >
            {/* The frame itself is a grab handle. Without it a text box being edited has
                nowhere to take hold of — every pointer inside it belongs to the caret —
                and the ring showed no cursor at all, so it did not look like it moved.
                Before the handles in the DOM, so a corner still resizes. */}
            {(['n', 'e', 's', 'w'] as const).map((side) => (
              <div
                key={side}
                className={`selection-edge is-${side}`}
                onPointerDown={(e) => startDrag(e, 'move')}
              />
            ))}
            <div className={`rotate-handle-arm${rotateBelow ? ' is-below' : ''}`} aria-hidden />
            <div
              className={`rotate-handle${rotateBelow ? ' is-below' : ''}`}
              role="slider"
              aria-label="Rotate"
              aria-valuenow={rotation}
              aria-valuemin={-180}
              aria-valuemax={180}
              title="Drag to rotate · hold Shift to snap"
              onPointerDown={(e) => startDrag(e, 'rotate')}
            >
              <RotateCw size={11} strokeWidth={2} aria-hidden />
            </div>
            {HANDLES.map(({ handle, className: handleClass }) => (
              <div
                key={handle}
                className={`resize-handle ${handleClass}`}
                onPointerDown={(e) => startDrag(e, handle)}
              />
            ))}
          </div>,
          layer
        )
      : null;

  return (
    <>
      {box}
      {chrome}
    </>
  );
}
