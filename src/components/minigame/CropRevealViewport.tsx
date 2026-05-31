import { useCallback, useRef, useState } from 'react';
import type { CropAnchor, TileAttachment } from '../../types/board';
import { anchorFocalPoint, cropInsetForAnchor } from '../../lib/cropReveal';
import { TileAttachmentView } from '../clue/TileAttachmentView';
import { ImageEnlargeOverlay } from '../clue/ImageEnlargeOverlay';
import './CropRevealViewport.css';

interface CropRevealViewportProps {
  attachment: TileAttachment;
  revealPercent: number;
  anchor: CropAnchor;
  customAnchorX?: number;
  customAnchorY?: number;
  interactive?: boolean;
  /** When true, click to enlarge while preserving current crop reveal (game mode). */
  enlargeable?: boolean;
  onAnchorChange?: (x: number, y: number) => void;
  className?: string;
  mediaClassName?: string;
  transition?: boolean;
}

export function CropRevealViewport({
  attachment,
  revealPercent,
  anchor,
  customAnchorX,
  customAnchorY,
  interactive = false,
  enlargeable = false,
  onAnchorChange,
  className = '',
  mediaClassName = 'cr-media',
  transition = false,
}: CropRevealViewportProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const focal = anchorFocalPoint(anchor, customAnchorX, customAnchorY);
  const inset = cropInsetForAnchor(revealPercent, anchor, customAnchorX, customAnchorY);
  const canEnlarge = enlargeable && !interactive;

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

  return (
    <>
      <div
        ref={wrapRef}
        className={`cr-viewport-wrap${interactive ? ' cr-viewport-wrap-interactive' : ''}${canEnlarge ? ' cr-viewport-wrap-enlargeable' : ''}${dragging ? ' cr-viewport-wrap-dragging' : ''}${className ? ` ${className}` : ''}`}
        onClick={() => {
          if (canEnlarge) setEnlarged(true);
        }}
        onKeyDown={(event) => {
          if (!canEnlarge) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setEnlarged(true);
          }
        }}
        role={canEnlarge ? 'button' : undefined}
        tabIndex={canEnlarge ? 0 : undefined}
        aria-label={canEnlarge ? 'Enlarge image' : undefined}
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
      <div
        className={`cr-viewport${transition ? ' cr-viewport-transition' : ''}`}
        style={{ clipPath: `inset(${inset})` }}
      >
        <TileAttachmentView attachment={attachment} className={mediaClassName} />
      </div>
      {interactive && (
        <span
          className="cr-focal-marker"
          style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
          aria-hidden="true"
        />
      )}
      </div>

      {canEnlarge && (
        <ImageEnlargeOverlay
          open={enlarged}
          onClose={() => setEnlarged(false)}
          label="Enlarged crop reveal"
        >
          <div
            className={`cr-viewport-wrap cr-viewport-wrap-lightbox${className ? ` ${className}` : ''}`}
          >
            <div
              className={`cr-viewport${transition ? ' cr-viewport-transition' : ''}`}
              style={{ clipPath: `inset(${inset})` }}
            >
              <TileAttachmentView attachment={attachment} className={mediaClassName} />
            </div>
          </div>
        </ImageEnlargeOverlay>
      )}
    </>
  );
}
