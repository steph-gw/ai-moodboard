import { useCallback, useEffect, useRef, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';

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
  onSelect: () => void;
  onChange: (patch: BoxPatch) => void;
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
  onChange,
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
        onChange(clamp(drag.origX + dx, drag.origY + dy, drag.origW, drag.origH));
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

    const onPointerUp = () => {
      dragRef.current = null;
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [scale, clamp, applyResize, onChange]);

  const startDrag = (e: ReactPointerEvent, mode: DragMode) => {
    if (readOnly) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();

    const box = (e.currentTarget as HTMLElement).closest('.canvas-element');
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
    };
  };

  return (
    <div
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
      {selected && !readOnly && (
        <>
          <div className="rotate-handle-arm" aria-hidden />
          <div
            className="rotate-handle"
            role="slider"
            aria-label="Rotate"
            aria-valuenow={rotation}
            aria-valuemin={-180}
            aria-valuemax={180}
            title="Drag to rotate · hold Shift to snap"
            onPointerDown={(e) => startDrag(e, 'rotate')}
          >
            <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden>
              <path
                d="M8 3.2V1L4.8 3.4 8 5.8V3.9a4.1 4.1 0 1 1-4.1 4.1H2.4A5.6 5.6 0 1 0 8 3.2z"
                fill="currentColor"
              />
            </svg>
          </div>
          {HANDLES.map(({ handle, className: handleClass }) => (
            <div
              key={handle}
              className={`resize-handle ${handleClass}`}
              onPointerDown={(e) => startDrag(e, handle)}
            />
          ))}
        </>
      )}
    </div>
  );
}
