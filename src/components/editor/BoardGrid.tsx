import { Check, Gamepad2, Image, Play, Plus, Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Board, Clue } from '../../types/board';
import { isMiniGameTile } from '../../types/board';
import { MAX_CATEGORY_COUNT, MIN_CATEGORY_COUNT } from '../../types/board';
import { clueStatus, isTileEmpty } from '../../lib/boardFactory';
import { getMiniGameReadiness } from '../../lib/miniGame';
import './BoardGrid.css';

interface BoardGridProps {
  board: Board;
  selectedClueId: string | null;
  onSelectClue: (categoryId: string, clueId: string) => void;
  onCategoryNameChange: (categoryId: string, name: string) => void;
  onAddCategory: () => void;
  onRemoveCategory: (categoryId: string) => void;
}

export function BoardGrid({
  board,
  selectedClueId,
  onSelectClue,
  onCategoryNameChange,
  onAddCategory,
  onRemoveCategory,
}: BoardGridProps) {
  const columnCount = board.categories.length;
  const gridStyle = { '--board-cols': columnCount } as CSSProperties;
  const canAdd = columnCount < MAX_CATEGORY_COUNT;
  const canRemove = columnCount > MIN_CATEGORY_COUNT;

  return (
    <div className="board-grid-editor" style={gridStyle}>
      <div className="board-grid-toolbar">
        <span className="board-grid-meta">
          {columnCount} categor{columnCount === 1 ? 'y' : 'ies'}
        </span>
        <button
          type="button"
          className="btn btn-sm"
          disabled={!canAdd}
          aria-label="Add category column"
          onClick={onAddCategory}
        >
          <Plus size={14} aria-hidden="true" />
          Add Category
        </button>
      </div>

      <div className="board-grid-categories" role="row">
        {board.categories.map((category) => (
          <div key={category.id} className="category-header" role="columnheader">
            <input
              className="category-name-input"
              value={category.name}
              aria-label={`Category name for ${category.name}`}
              onChange={(e) => onCategoryNameChange(category.id, e.target.value)}
            />
            <button
              type="button"
              className="category-remove-btn"
              disabled={!canRemove}
              aria-label={`Remove ${category.name} column`}
              title={canRemove ? 'Remove column' : 'At least one category is required'}
              onClick={() => onRemoveCategory(category.id)}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <div className="board-grid-clues" role="grid" aria-label="Board grid">
        {board.categories[0]?.clues.map((_, rowIndex) => (
          <div key={rowIndex} className="board-grid-row" role="row">
            {board.categories.map((category) => {
              const clue = category.clues[rowIndex];
              if (!clue) return null;
              return (
                <ClueTile
                  key={clue.id}
                  board={board}
                  clue={clue}
                  selected={selectedClueId === clue.id}
                  onSelect={() => onSelectClue(category.id, clue.id)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ClueTile({
  board,
  clue,
  selected,
  onSelect,
}: {
  board: Board;
  clue: Clue;
  selected: boolean;
  onSelect: () => void;
}) {
  const isMini = isMiniGameTile(clue);
  const status = clueStatus(clue, board);
  const isComplete = status === 'complete';
  const isEmpty = isTileEmpty(clue, board);
  const mgReadiness = isMini ? getMiniGameReadiness(board, clue) : null;

  return (
    <button
      type="button"
      className={`clue-tile${selected ? ' clue-tile-selected' : ''}${isEmpty ? ' clue-tile-empty' : ''}${isMini ? ' clue-tile-minigame' : ''}`}
      role="gridcell"
      aria-pressed={selected}
      aria-label={
        isMini
          ? `${clue.value} point mini game, Character Guess${isComplete ? ', ready' : ''}`
          : `${clue.value} point clue${isComplete ? ', completed' : ''}${clue.isDailyDouble ? ', daily double' : ''}`
      }
      onClick={onSelect}
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
      <span className="clue-tile-value">{clue.value}</span>
      {isMini && clue.miniGame?.title && (
        <span className="clue-tile-mg-type">Character Guess</span>
      )}
      {isEmpty && !isMini && <span className="clue-tile-add">+ Add clue</span>}
      {isEmpty && isMini && <span className="clue-tile-add">+ Setup mini game</span>}
      {mgReadiness && !isComplete && !isEmpty && (
        <span className={`clue-tile-mg-status mg-status-${mgReadiness.status}`}>
          {mgReadiness.label}
        </span>
      )}
      {!isMini && clue.media?.url && (
        <span className="clue-tile-media" aria-label="Has media attachment">
          {clue.media.type === 'video' ? <Play size={14} /> : <Image size={14} />}
        </span>
      )}
    </button>
  );
}
