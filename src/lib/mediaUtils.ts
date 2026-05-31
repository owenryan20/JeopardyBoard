import type { Board, Media, MediaType } from '../types/board';
import { collectAllLocalMediaIds } from './attachments';

export const MEDIA_SIZE_LIMITS: Record<MediaType, number> = {
  image: 5 * 1024 * 1024,
  audio: 15 * 1024 * 1024,
  video: 50 * 1024 * 1024,
};

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);
const AUDIO_MIMES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/aac']);
const VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']);

export function inferMediaTypeFromMime(mime: string): MediaType | null {
  const normalized = mime.toLowerCase().split(';')[0]?.trim() ?? '';
  if (IMAGE_MIMES.has(normalized) || normalized.startsWith('image/')) return 'image';
  if (AUDIO_MIMES.has(normalized) || normalized.startsWith('audio/')) return 'audio';
  if (VIDEO_MIMES.has(normalized) || normalized.startsWith('video/')) return 'video';
  return null;
}

export function inferMediaTypeFromFilename(filename: string): MediaType | null {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return 'audio';
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  return null;
}

export function validateMediaFile(file: File, expectedType?: MediaType): string | null {
  const type = inferMediaTypeFromMime(file.type) ?? inferMediaTypeFromFilename(file.name);
  if (!type) {
    return 'Unsupported file type. Use JPEG/PNG/GIF/WebP, MP3/WAV, or MP4/WebM.';
  }
  if (expectedType && type !== expectedType) {
    return `Expected ${expectedType} but got ${type}. Change media type or pick another file.`;
  }
  const limit = MEDIA_SIZE_LIMITS[type];
  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    return `File is too large. Max ${mb} MB for ${type}.`;
  }
  return null;
}

export function isLocalMedia(media?: Media): boolean {
  return media?.storage === 'local' && Boolean(media.mediaId);
}

export function hasClueMedia(media?: Media): boolean {
  if (!media) return false;
  if (isLocalMedia(media)) return true;
  return Boolean(media.url?.trim());
}

export function normalizeMedia(raw?: Partial<Media> | null): Media | undefined {
  if (!raw) return undefined;

  if (raw.storage === 'local' && raw.mediaId) {
    return {
      storage: 'local',
      type: raw.type ?? 'image',
      mediaId: raw.mediaId,
      mimeType: raw.mimeType,
      filename: raw.filename,
      altText: raw.altText,
      url: '',
    };
  }

  const url = raw.url?.trim();
  if (url) {
    return {
      storage: 'url',
      type: raw.type ?? 'image',
      url,
      filename: raw.filename,
      altText: raw.altText,
    };
  }

  if (raw.mediaId) {
    return {
      storage: 'local',
      type: raw.type ?? 'image',
      mediaId: raw.mediaId,
      mimeType: raw.mimeType,
      filename: raw.filename,
      altText: raw.altText,
      url: '',
    };
  }

  return undefined;
}

/** Persist only when a URL or uploaded file is attached. */
export function mediaForSave(raw?: Partial<Media> | null): Media | undefined {
  const media = normalizeMedia(raw);
  return media && hasClueMedia(media) ? media : undefined;
}

export function collectLocalMediaIds(board: Board): string[] {
  return collectAllLocalMediaIds(board);
}

export function collectLocalMediaIdsFromBoards(boards: Board[]): Set<string> {
  const ids = new Set<string>();
  for (const board of boards) {
    for (const id of collectLocalMediaIds(board)) {
      ids.add(id);
    }
  }
  return ids;
}

export function sanitizeMediaFilename(filename: string): string {
  const base = filename.trim() || 'file';
  return base.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 120);
}

export function formatMediaSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
