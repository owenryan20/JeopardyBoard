import { ChevronRight } from 'lucide-react';
import type { AttachmentDisplayMode, Clue, TileAttachment } from '../../types/board';
import { hasAttachments } from '../../lib/attachments';
import { TileAttachmentView } from './TileAttachmentView';
import './ClueAttachments.css';

interface ClueAttachmentsProps {
  clue: Clue;
  displayMode?: AttachmentDisplayMode;
  /** Current index for progressive mode (0-based). */
  revealIndex?: number;
  onRevealNext?: () => void;
  showProgress?: boolean;
  /** Allow clicking image attachments to enlarge (game mode). */
  enlargeImages?: boolean;
}

export function ClueAttachments({
  clue,
  displayMode,
  revealIndex = 0,
  onRevealNext,
  showProgress = false,
  enlargeImages = false,
}: ClueAttachmentsProps) {
  const attachments = clue.attachments ?? [];
  if (!hasAttachments(clue)) return null;

  const mode = displayMode ?? clue.attachmentDisplayMode ?? 'all-at-once';

  if (mode === 'all-at-once') {
    return (
      <div className="clue-attachments clue-attachments-all">
        {attachments.map((att) => (
          <TileAttachmentView key={att.id} attachment={att} enlargeable={enlargeImages} />
        ))}
      </div>
    );
  }

  const visible = attachments.slice(0, revealIndex + 1);
  const hasMore = revealIndex < attachments.length - 1;

  return (
    <div className="clue-attachments clue-attachments-progressive">
      {showProgress && attachments.length > 1 && (
        <p className="attachment-progress" aria-live="polite">
          Attachment {Math.min(revealIndex + 1, attachments.length)} of {attachments.length}
        </p>
      )}
      {visible.map((att) => (
        <TileAttachmentView key={att.id} attachment={att} enlargeable={enlargeImages} />
      ))}
      {hasMore && onRevealNext && (
        <button type="button" className="btn btn-sm attachment-reveal-next" onClick={onRevealNext}>
          <ChevronRight size={16} aria-hidden="true" />
          Reveal next attachment
        </button>
      )}
    </div>
  );
}

export function attachmentCount(clue: Clue): number {
  return clue.attachments?.length ?? 0;
}

export function visibleAttachments(
  clue: Clue,
  revealIndex: number,
): TileAttachment[] {
  const attachments = clue.attachments ?? [];
  const mode = clue.attachmentDisplayMode ?? 'all-at-once';
  if (mode === 'all-at-once') return attachments;
  return attachments.slice(0, revealIndex + 1);
}
