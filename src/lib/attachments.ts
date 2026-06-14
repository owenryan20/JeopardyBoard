import type {
  AttachmentDisplayMode,
  Board,
  Clue,
  Media,
  TileAttachment,
  TileAttachmentType,
} from '../types/board';
import { createId } from './ids';
import { hasClueMedia, isLocalMedia, normalizeMedia } from './mediaUtils';

export const DEFAULT_ATTACHMENT_DISPLAY_MODE: AttachmentDisplayMode = 'all-at-once';

export function isMediaAttachmentType(type: TileAttachmentType): boolean {
  return type === 'image' || type === 'audio' || type === 'video';
}

export function mediaToAttachment(media: Media, title?: string): TileAttachment {
  return {
    id: media.mediaId ?? createId(),
    type: media.type as TileAttachmentType,
    title: title ?? '',
    url: media.url ?? '',
    storage: media.storage ?? (media.mediaId ? 'local' : 'url'),
    mediaId: media.mediaId,
    mimeType: media.mimeType,
    alt: media.altText,
  };
}

export function migrateClueAttachments(clue: Clue): Clue {
  const existing = clue.attachments ?? [];
  const legacy = normalizeMedia(clue.media);
  let attachments = existing.length > 0 ? existing.map(normalizeAttachment).filter(Boolean) as TileAttachment[] : [];

  if (attachments.length === 0 && legacy && hasClueMedia(legacy)) {
    attachments = [mediaToAttachment(legacy)];
  }

  const { media: _removed, ...rest } = clue;
  return {
    ...rest,
    attachments,
    attachmentDisplayMode: clue.attachmentDisplayMode ?? DEFAULT_ATTACHMENT_DISPLAY_MODE,
    media: attachments.length > 0 ? undefined : mediaForSaveLegacy(clue.media),
  };
}

function mediaForSaveLegacy(raw?: Media): Media | undefined {
  const media = normalizeMedia(raw);
  return media && hasClueMedia(media) ? media : undefined;
}

export function normalizeAttachment(raw: Partial<TileAttachment>): TileAttachment | null {
  const type = raw.type;
  if (!type) return null;
  const hasLocal = raw.storage === 'local' && raw.mediaId;
  const url = raw.url?.trim();
  if (!hasLocal && !url && type !== 'text' && type !== 'link') return null;

  return {
    id: raw.id ?? createId(),
    type,
    title: raw.title?.trim() || (isMediaAttachmentType(type) ? '' : 'Attachment'),
    url: url ?? '',
    storage: raw.storage ?? (raw.mediaId ? 'local' : 'url'),
    mediaId: raw.mediaId,
    mimeType: raw.mimeType,
    alt: raw.alt,
    thumbnailUrl: raw.thumbnailUrl,
    textContent: raw.textContent,
  };
}

export function hasAttachments(clue: Clue): boolean {
  return (clue.attachments?.length ?? 0) > 0;
}

export function attachmentsForSave(attachments?: TileAttachment[]): TileAttachment[] {
  return (attachments ?? [])
    .map((a) => normalizeAttachment(a))
    .filter((a): a is TileAttachment => Boolean(a));
}

export function collectLocalMediaIdsFromClue(clue: Clue): string[] {
  const ids: string[] = [];
  for (const att of clue.attachments ?? []) {
    if (att.storage === 'local' && att.mediaId) ids.push(att.mediaId);
  }
  const legacy = normalizeMedia(clue.media);
  if (legacy && isLocalMedia(legacy) && legacy.mediaId) ids.push(legacy.mediaId);
  const answer = normalizeMedia(clue.answerMedia);
  if (answer && isLocalMedia(answer) && answer.mediaId) ids.push(answer.mediaId);
  if (clue.miniGame?.gameType === 'cropReveal' && clue.miniGame.image.storage === 'local' && clue.miniGame.image.mediaId) {
    ids.push(clue.miniGame.image.mediaId);
  }
  return ids;
}

export function collectAllLocalMediaIds(board: Board): string[] {
  const ids = new Set<string>();
  for (const cat of board.categories) {
    for (const clue of cat.clues) {
      for (const id of collectLocalMediaIdsFromClue(clue)) ids.add(id);
    }
  }
  for (const id of collectLocalMediaIdsFromClue(board.finalJeopardy.tile)) ids.add(id);
  if (board.theme?.background?.type === 'image' && board.theme.background.mediaId) {
    ids.add(board.theme.background.mediaId);
  }
  if (board.previewImage?.storage === 'local' && board.previewImage.mediaId) {
    ids.add(board.previewImage.mediaId);
  }
  return [...ids];
}

export function reorderAttachments(
  attachments: TileAttachment[],
  fromIndex: number,
  toIndex: number,
): TileAttachment[] {
  const next = [...attachments];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return attachments;
  next.splice(toIndex, 0, item);
  return next;
}
