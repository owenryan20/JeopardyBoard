import { useEffect, useState } from 'react';
import type { MediaStorage } from '../types/board';
import { getMediaBlob } from '../lib/mediaStorage';

export interface StoredImageRef {
  url?: string;
  storage?: MediaStorage;
  mediaId?: string;
}

export function useStoredImageUrl(ref?: StoredImageRef | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const imageMediaId = ref?.storage === 'local' ? ref.mediaId : undefined;
  const imageUrl = ref?.storage !== 'local' ? ref?.url : undefined;

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function load() {
      if (!ref) {
        setUrl(null);
        return;
      }
      if (ref.storage === 'local' && ref.mediaId) {
        const blob = await getMediaBlob(ref.mediaId);
        if (cancelled) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        } else {
          setUrl(null);
        }
        return;
      }
      setUrl(ref.url?.trim() || null);
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [ref, imageMediaId, imageUrl]);

  return url;
}

export function hasPreviewImage(ref?: StoredImageRef | null): boolean {
  if (!ref) return false;
  if (ref.storage === 'local' && ref.mediaId) return true;
  return Boolean(ref.url?.trim());
}
