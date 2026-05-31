import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ImageEnlargeOverlay.css';

interface ImageEnlargeOverlayProps {
  open: boolean;
  onClose: () => void;
  label?: string;
  children: React.ReactNode;
}

export function ImageEnlargeOverlay({
  open,
  onClose,
  label = 'Enlarged image',
  children,
}: ImageEnlargeOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="image-enlarge-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
    >
      <div className="image-enlarge-content" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
