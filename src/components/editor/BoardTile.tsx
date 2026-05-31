import { Check, Gamepad2, Image, Music2, Play } from 'lucide-react';
import type { Board, Clue } from '../../types/board';
import { isMiniGameTile } from '../../types/board';
import { clueStatus, isTileEmpty } from '../../lib/boardFactory';
import { getMiniGameReadiness } from '../../lib/miniGame';
import { hasAttachments } from '../../lib/attachments';
import { hasClueMedia } from '../../lib/mediaUtils';

interface BoardTileProps {
  board: Board;
  clue: Clue;
  selected?: boolean;
  showValue?: boolean;
  compact?: boolean;
  onSelect: () => void;
  onEdit?: () => void;
}

export function BoardTile({
  board,
  clue,
  selected = false,
  showValue = true,
  compact = false,
  onSelect,
  onEdit,
}: BoardTileProps) {
  const isMini = isMiniGameTile(clue);
  const status = clueStatus(clue, board);
  const isComplete = status === 'complete';
  const isEmpty = isTileEmpty(clue, board);
  const mgReadiness = isMini ? getMiniGameReadiness(board, clue) : null;

  return (
    <button
      type="button"
      className={`clue-tile${selected ? ' clue-tile-selected' : ''}${isEmpty ? ' clue-tile-empty' : ''}${isMini ? ' clue-tile-minigame' : ''}${compact ? ' clue-tile-compact' : ''}`}
      role="gridcell"
      aria-pressed={selected}
      aria-label={
        isMini
          ? `${showValue && clue.value ? `${clue.value} point ` : ''}mini game, Character Guess${isComplete ? ', ready' : ''}`
          : `${showValue && clue.value ? `${clue.value} point ` : ''}clue${isComplete ? ', completed' : ''}${clue.isDailyDouble ? ', daily double' : ''}`
      }
      onClick={onSelect}
      onDoubleClick={() => {
        if (!isEmpty) onEdit?.();
      }}
    >
      {isComplete && (
        <span className="clue-tile-check" aria-hidden="true">
          <Check size={14} />
          <span className="sr-only">{isMini ? 'Ready' : 'Completed'}</span>
        </span>
      )}
      {isMini && (
        <span className="clue-tile-mg-badge" aria-hidden="true">
          <Gamepad2 size={12} />
          <span>Mini Game</span>
        </span>
      )}
      {!isMini && clue.isDailyDouble && (
        <span className="clue-tile-dd badge badge-dd" aria-label="Daily Double">
          DD
        </span>
      )}
      {showValue && clue.value > 0 && (
        <span className="clue-tile-value">{clue.value}</span>
      )}
      {!showValue && !isMini && isEmpty && (
        <span className="clue-tile-value clue-tile-fj-label">Final</span>
      )}
      {isMini && clue.miniGame?.gameType === 'cropReveal' && (
        <span className="clue-tile-mg-type">Crop Reveal</span>
      )}
      {isMini && clue.miniGame?.gameType === 'characterGuess' && (
        <span className="clue-tile-mg-type">Character Guess</span>
      )}
      {isEmpty && !isMini && <span className="clue-tile-add">+ Add clue</span>}
      {isEmpty && isMini && <span className="clue-tile-add">+ Setup mini game</span>}
      {mgReadiness && !isComplete && !isEmpty && (
        <span className={`clue-tile-mg-status mg-status-${mgReadiness.status}`}>
          {mgReadiness.label}
        </span>
      )}
      {(!isMini && (hasAttachments(clue) || hasClueMedia(clue.media))) && (
        <span className="clue-tile-media" aria-label="Has attachments">
          {clue.attachments?.[0]?.type === 'video' || clue.media?.type === 'video' ? (
            <Play size={14} />
          ) : clue.attachments?.[0]?.type === 'audio' || clue.media?.type === 'audio' ? (
            <Music2 size={14} />
          ) : (
            <Image size={14} />
          )}
        </span>
      )}
    </button>
  );
}
