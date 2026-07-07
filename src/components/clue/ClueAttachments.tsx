import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AttachmentDisplayMode, AttachmentLayout, Clue, TileAttachment } from '../../types/board';
import {
  DEFAULT_ATTACHMENT_LAYOUT,
  hasAttachments,
  normalizeAttachmentDisplayMode,
  normalizeAttachmentLayout,
} from '../../lib/attachments';
import { TileAttachmentView } from './TileAttachmentView';
import './ClueAttachments.css';

interface ClueAttachmentsProps {
  clue: Clue;
  displayMode?: AttachmentDisplayMode;
  layout?: AttachmentLayout;
  /** Current index for progressive / single modes (0-based). */
  revealIndex?: number;
  onRevealNext?: () => void;
  onRevealPrevious?: () => void;
  showProgress?: boolean;
  /** Allow clicking image attachments to enlarge (game mode). */
  enlargeImages?: boolean;
}

function AttachmentWithClue({
  attachment,
  enlargeable,
  autoplay,
}: {
  attachment: TileAttachment;
  enlargeable?: boolean;
  autoplay?: boolean;
}) {
  const clueText = attachment.clue?.trim();

  return (
    <div className="attachment-reveal-block">
      {clueText && <p className="attachment-clue-text">{clueText}</p>}
      <TileAttachmentView attachment={attachment} enlargeable={enlargeable} autoplay={autoplay} />
    </div>
  );
}

function layoutClass(layout: AttachmentLayout, count: number): string {
  if (count < 2) return 'clue-attachments-layout-stack';
  return `clue-attachments-layout-${layout}`;
}

function AttachmentProgress({
  index,
  total,
}: {
  index: number;
  total: number;
}) {
  if (total <= 1) return null;
  return (
    <p className="attachment-progress" aria-live="polite">
      Attachment {index + 1} of {total}
    </p>
  );
}

function AttachmentRevealControls({
  canGoPrevious,
  canGoNext,
  onRevealPrevious,
  onRevealNext,
  nextLabel = 'Next attachment',
}: {
  canGoPrevious: boolean;
  canGoNext: boolean;
  onRevealPrevious?: () => void;
  onRevealNext?: () => void;
  nextLabel?: string;
}) {
  if (!canGoPrevious && !canGoNext) return null;

  return (
    <div className="attachment-reveal-controls">
      {canGoPrevious && onRevealPrevious && (
        <button type="button" className="btn btn-sm" onClick={onRevealPrevious}>
          <ChevronLeft size={16} aria-hidden="true" />
          Previous
        </button>
      )}
      {canGoNext && onRevealNext && (
        <button type="button" className="btn btn-sm attachment-reveal-next" onClick={onRevealNext}>
          <ChevronRight size={16} aria-hidden="true" />
          {nextLabel}
        </button>
      )}
    </div>
  );
}

export function ClueAttachments({
  clue,
  displayMode,
  layout,
  revealIndex = 0,
  onRevealNext,
  onRevealPrevious,
  showProgress = false,
  enlargeImages = false,
}: ClueAttachmentsProps) {
  const attachments = clue.attachments ?? [];
  if (!hasAttachments(clue)) return null;

  const mode = normalizeAttachmentDisplayMode(displayMode ?? clue.attachmentDisplayMode);
  const resolvedLayout = normalizeAttachmentLayout(layout ?? clue.attachmentLayout ?? DEFAULT_ATTACHMENT_LAYOUT);
  const viewProps = { enlargeable: enlargeImages, autoplay: clue.attachmentAutoplay };

  if (mode === 'all-at-once') {
    return (
      <div
        className={`clue-attachments clue-attachments-all ${layoutClass(resolvedLayout, attachments.length)}`}
      >
        {attachments.map((att) => (
          <AttachmentWithClue key={att.id} attachment={att} {...viewProps} />
        ))}
      </div>
    );
  }

  if (mode === 'single') {
    const index = Math.min(Math.max(revealIndex, 0), attachments.length - 1);
    const current = attachments[index];
    if (!current) return null;

    return (
      <div className="clue-attachments clue-attachments-single clue-attachments-layout-stack">
        {showProgress && <AttachmentProgress index={index} total={attachments.length} />}
        <AttachmentWithClue attachment={current} {...viewProps} />
        <AttachmentRevealControls
          canGoPrevious={index > 0}
          canGoNext={index < attachments.length - 1}
          onRevealPrevious={onRevealPrevious}
          onRevealNext={onRevealNext}
        />
      </div>
    );
  }

  const visible = attachments.slice(0, revealIndex + 1);
  const hasMore = revealIndex < attachments.length - 1;

  return (
    <div
      className={`clue-attachments clue-attachments-progressive ${layoutClass(resolvedLayout, visible.length)}`}
    >
      {showProgress && <AttachmentProgress index={revealIndex} total={attachments.length} />}
      {visible.map((att) => (
        <AttachmentWithClue key={att.id} attachment={att} {...viewProps} />
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
  const mode = normalizeAttachmentDisplayMode(clue.attachmentDisplayMode);
  if (mode === 'all-at-once') return attachments;
  if (mode === 'single') {
    const index = Math.min(Math.max(revealIndex, 0), attachments.length - 1);
    return attachments[index] ? [attachments[index]] : [];
  }
  return attachments.slice(0, revealIndex + 1);
}
