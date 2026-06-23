import { useCallback, useEffect, useRef, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface DraggableBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
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
  onChange: (patch: { x: number; y: number; width: number; height: number }) => void;
  onDoubleClick?: () => void;
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

export function DraggableBox({
  x,
  y,
  width,
  height,
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
  children,
}: DraggableBoxProps) {
  const dragRef = useRef<{
    mode: 'move' | ResizeHandle;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
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
      const dx = (e.clientX - drag.startX) / scale;
      const dy = (e.clientY - drag.startY) / scale;

      if (drag.mode === 'move') {
        onChange(clamp(drag.origX + dx, drag.origY + dy, drag.origW, drag.origH));
      } else {
        onChange(
          applyResize(drag.mode, dx, dy, drag.origX, drag.origY, drag.origW, drag.origH)
        );
      }
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

  const startDrag = (e: ReactPointerEvent, mode: 'move' | ResizeHandle) => {
    if (readOnly) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: x,
      origY: y,
      origW: width,
      origH: height,
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
      }}
      onPointerDown={(e) => !readOnly && startDrag(e, 'move')}
      onDoubleClick={onDoubleClick}
    >
      {children}
      {selected && !readOnly &&
        HANDLES.map(({ handle, className: handleClass }) => (
          <div
            key={handle}
            className={`resize-handle ${handleClass}`}
            onPointerDown={(e) => startDrag(e, handle)}
          />
        ))}
    </div>
  );
}
