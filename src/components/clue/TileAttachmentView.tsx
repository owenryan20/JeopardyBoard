import { useEffect, useState } from 'react';
import type { TileAttachment } from '../../types/board';
import { getMediaBlob } from '../../lib/mediaStorage';
import { AudioAttachmentPlayer } from './AudioAttachmentPlayer';
import { ImageEnlargeOverlay } from './ImageEnlargeOverlay';

interface TileAttachmentViewProps {
  attachment: TileAttachment;
  className?: string;
  /** When true, image attachments can be clicked to enlarge (game mode). */
  enlargeable?: boolean;
}

export function TileAttachmentView({ attachment, className = 'clue-overlay-media', enlargeable = false }: TileAttachmentViewProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [enlarged, setEnlarged] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function load() {
      setMissing(false);
      setSrc(null);

      if (attachment.storage === 'local' && attachment.mediaId) {
        const blob = await getMediaBlob(attachment.mediaId);
        if (cancelled) return;
        if (!blob) {
          setMissing(true);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        return;
      }

      const url = attachment.url?.trim() || attachment.thumbnailUrl?.trim();
      if (url) setSrc(url);
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.mediaId, attachment.storage, attachment.url, attachment.thumbnailUrl]);

  if (missing) {
    return (
      <div className={className}>
        <p className="media-missing" role="status">
          Attachment not found. Re-upload or import a ZIP backup.
        </p>
      </div>
    );
  }

  if (attachment.type === 'text') {
    return (
      <div className={`${className} attachment-text`}>
        <strong>{attachment.title}</strong>
        <p>{attachment.textContent || attachment.url}</p>
      </div>
    );
  }

  if (attachment.type === 'link' || attachment.type === 'file') {
    const href = attachment.url?.trim();
    if (!href) return null;
    return (
      <div className={className}>
        <a href={href} target="_blank" rel="noopener noreferrer">
          {attachment.title || href}
        </a>
      </div>
    );
  }

  if (!src) return null;

  const displayTitle = attachment.title?.trim();
  const altText = attachment.alt || displayTitle || 'Attachment';

  return (
    <div className={className}>
      {attachment.type === 'image' ? (
        <figure className="attachment-figure">
          {enlargeable ? (
            <button
              type="button"
              className="attachment-image-enlarge-btn"
              onClick={() => setEnlarged(true)}
              aria-label="Enlarge image"
            >
              <img src={src} alt={altText} />
            </button>
          ) : (
            <img src={src} alt={altText} />
          )}
          {displayTitle ? <figcaption>{displayTitle}</figcaption> : null}
        </figure>
      ) : attachment.type === 'video' ? (
        <video src={src} controls className="attachment-video" title={displayTitle || undefined} />
      ) : (
        <AudioAttachmentPlayer src={src} title={displayTitle ?? ''} />
      )}
      {enlargeable && attachment.type === 'image' && (
        <ImageEnlargeOverlay
          open={enlarged}
          onClose={() => setEnlarged(false)}
          label={altText}
        >
          <img src={src} alt={altText} className="image-enlarge-img" />
        </ImageEnlargeOverlay>
      )}
    </div>
  );
}
