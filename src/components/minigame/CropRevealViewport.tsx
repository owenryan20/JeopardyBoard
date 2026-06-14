import { useCallback, useRef, useState } from 'react';
import type { CropAnchor, TileAttachment } from '../../types/board';
import { anchorFocalPoint, cropInsetForAnchor, cropZoomTransform } from '../../lib/cropReveal';
import { TileAttachmentView } from '../clue/TileAttachmentView';
import './CropRevealViewport.css';

interface CropRevealViewportProps {
  attachment: TileAttachment;
  revealPercent: number;
  anchor: CropAnchor;
  customAnchorX?: number;
  customAnchorY?: number;
  interactive?: boolean;
  onAnchorChange?: (x: number, y: number) => void;
  className?: string;
  mediaClassName?: string;
  transition?: boolean;
}

function CropRevealMedia({
  attachment,
  mediaClassName,
  mode,
  revealPercent,
  anchor,
  customAnchorX,
  customAnchorY,
  transition,
}: {
  attachment: TileAttachment;
  mediaClassName: string;
  mode: 'zoom' | 'clip';
  revealPercent: number;
  anchor: CropAnchor;
  customAnchorX?: number;
  customAnchorY?: number;
  transition: boolean;
}) {
  if (mode === 'zoom') {
    const { scale, originX, originY } = cropZoomTransform(
      revealPercent,
      anchor,
      customAnchorX,
      customAnchorY,
    );

    return (
      <div className="cr-viewport-zoom">
        <div
          className={`cr-zoom-inner${transition ? ' cr-zoom-inner-transition' : ''}`}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: `${originX}% ${originY}%`,
          }}
        >
          <TileAttachmentView attachment={attachment} className={mediaClassName} />
        </div>
      </div>
    );
  }

  const inset = cropInsetForAnchor(revealPercent, anchor, customAnchorX, customAnchorY);

  return (
    <div
      className={`cr-viewport${transition ? ' cr-viewport-transition' : ''}`}
      style={{ clipPath: `inset(${inset})` }}
    >
      <TileAttachmentView attachment={attachment} className={mediaClassName} />
    </div>
  );
}

export function CropRevealViewport({
  attachment,
  revealPercent,
  anchor,
  customAnchorX,
  customAnchorY,
  interactive = false,
  onAnchorChange,
  className = '',
  mediaClassName = 'cr-media',
  transition = false,
}: CropRevealViewportProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const focal = anchorFocalPoint(anchor, customAnchorX, customAnchorY);
  const displayMode = interactive ? 'clip' : 'zoom';

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = wrapRef.current;
      if (!el || !onAnchorChange) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
      const y = Math.round(Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)));
      onAnchorChange(x, y);
    },
    [onAnchorChange],
  );

  const viewportContent = (
    <CropRevealMedia
      attachment={attachment}
      mediaClassName={mediaClassName}
      mode={displayMode}
      revealPercent={revealPercent}
      anchor={anchor}
      customAnchorX={customAnchorX}
      customAnchorY={customAnchorY}
      transition={transition}
    />
  );

  return (
    <div
      ref={wrapRef}
      className={`cr-viewport-wrap${interactive ? ' cr-viewport-wrap-interactive' : ''}${dragging ? ' cr-viewport-wrap-dragging' : ''}${displayMode === 'zoom' ? ' cr-viewport-wrap-zoom' : ''}${className ? ` ${className}` : ''}`}
      onPointerDown={(e) => {
        if (!interactive || !onAnchorChange) return;
        e.preventDefault();
        e.stopPropagation();
        wrapRef.current?.setPointerCapture(e.pointerId);
        setDragging(true);
        updateFromPointer(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!dragging || !interactive) return;
        updateFromPointer(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (!dragging) return;
        setDragging(false);
        wrapRef.current?.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={(e) => {
        setDragging(false);
        wrapRef.current?.releasePointerCapture(e.pointerId);
      }}
    >
      {viewportContent}
      {interactive && (
        <span
          className="cr-focal-marker"
          style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
