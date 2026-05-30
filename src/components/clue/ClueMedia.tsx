import { useEffect, useState } from 'react';
import type { Media } from '../../types/board';
import { getMediaBlob } from '../../lib/mediaStorage';
import { hasClueMedia, isLocalMedia } from '../../lib/mediaUtils';

interface ClueMediaProps {
  media: Media;
  className?: string;
}

export function ClueMedia({ media, className = 'clue-overlay-media' }: ClueMediaProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function load() {
      setMissing(false);
      setSrc(null);

      if (isLocalMedia(media) && media.mediaId) {
        const blob = await getMediaBlob(media.mediaId);
        if (cancelled) return;
        if (!blob) {
          setMissing(true);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        return;
      }

      const url = media.url?.trim();
      if (url) {
        setSrc(url);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [media.mediaId, media.storage, media.url]);

  if (!hasClueMedia(media)) return null;

  if (missing) {
    return (
      <div className={className}>
        <p className="media-missing" role="status">
          Uploaded media not found in this browser. Re-upload the file or import a ZIP backup.
        </p>
      </div>
    );
  }

  if (!src) return null;

  return (
    <div className={className}>
      {media.type === 'image' ? (
        <img src={src} alt={media.altText || 'Clue media'} />
      ) : media.type === 'video' ? (
        <video src={src} controls />
      ) : (
        <audio src={src} controls />
      )}
    </div>
  );
}
