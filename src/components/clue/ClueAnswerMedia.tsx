import { mediaToAttachment } from '../../lib/attachments';
import { hasAnswerMedia } from '../../lib/mediaUtils';
import type { Clue } from '../../types/board';
import { TileAttachmentView } from './TileAttachmentView';

interface ClueAnswerMediaProps {
  clue: Clue;
  enlargeImages?: boolean;
}

export function ClueAnswerMedia({ clue, enlargeImages = false }: ClueAnswerMediaProps) {
  if (!hasAnswerMedia(clue) || !clue.answerMedia) return null;

  return (
    <div className="clue-overlay-answer-media">
      <TileAttachmentView
        attachment={mediaToAttachment(clue.answerMedia)}
        enlargeable={enlargeImages && clue.answerMedia.type === 'image'}
        autoplay={clue.attachmentAutoplay}
      />
    </div>
  );
}
