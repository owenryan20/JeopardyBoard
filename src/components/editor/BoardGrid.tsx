import { Plus, Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Board } from '../../types/board';
import { MAX_CATEGORY_COUNT, MAX_CLUES_PER_CATEGORY, MIN_CATEGORY_COUNT, MIN_CLUES_PER_CATEGORY } from '../../types/board';
import { getCategoryHeaderStyle } from '../../lib/boardTheme';
import { useBoardThemeStyles } from '../../hooks/useBoardTheme';
import { BoardTile } from './BoardTile';
import './BoardGrid.css';

interface BoardGridProps {
  board: Board;
  selectedClueId: string | null;
  onSelectClue: (categoryId: string, clueId: string) => void;
  onEditClue: (categoryId: string, clueId: string) => void;
  onCategoryNameChange: (categoryId: string, name: string) => void;
  onAddCategory: () => void;
  onRemoveCategory: (categoryId: string) => void;
  onAddClue: (categoryId: string) => void;
  onRemoveClue: (categoryId: string, clueId: string) => void;
}

export function BoardGrid({
  board,
  selectedClueId,
  onSelectClue,
  onEditClue,
  onCategoryNameChange,
  onAddCategory,
  onRemoveCategory,
  onAddClue,
  onRemoveClue,
}: BoardGridProps) {
  const columnCount = board.categories.length;
  const themeStyles = useBoardThemeStyles(board);
  const gridStyle = { '--board-cols': columnCount, ...themeStyles } as CSSProperties;
  const canAddCategory = columnCount < MAX_CATEGORY_COUNT;
  const canRemoveCategory = columnCount > MIN_CATEGORY_COUNT;

  return (
    <div className="board-grid-editor" style={gridStyle}>
      <div className="board-grid-toolbar">
        <span className="board-grid-meta">
          {columnCount} categor{columnCount === 1 ? 'y' : 'ies'}
        </span>
        <button
          type="button"
          className="btn btn-sm"
          disabled={!canAddCategory}
          aria-label="Add category column"
          onClick={onAddCategory}
        >
          <Plus size={14} aria-hidden="true" />
          Add Category
        </button>
      </div>

      <div className="board-grid-columns" role="grid" aria-label="Board grid">
        {board.categories.map((category) => {
          const canAddClue = category.clues.length < MAX_CLUES_PER_CATEGORY;
          const canRemoveClue = category.clues.length > MIN_CLUES_PER_CATEGORY;
          const headerStyle = getCategoryHeaderStyle(category, board);

          return (
            <div key={category.id} className="board-grid-column" role="presentation">
              <div
                className="category-header"
                role="columnheader"
                style={{
                  background: headerStyle.headerBackgroundImage
                    ? `url(${headerStyle.headerBackgroundImage}) center/cover`
                    : headerStyle.headerBackground,
                  color: headerStyle.headerTextColor,
                }}
              >
                <input
                  className="category-name-input"
                  value={category.name}
                  aria-label={`Category name for ${category.name}`}
                  onChange={(e) => onCategoryNameChange(category.id, e.target.value)}
                />
                <button
                  type="button"
                  className="category-remove-btn"
                  disabled={!canRemoveCategory}
                  aria-label={`Remove ${category.name} column`}
                  title={canRemoveCategory ? 'Remove column' : 'At least one category is required'}
                  onClick={() => onRemoveCategory(category.id)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>

              <div className="board-grid-column-clues">
                {category.clues.map((clue) => (
                  <div key={clue.id} className="board-grid-tile-wrap">
                    <BoardTile
                      board={board}
                      clue={clue}
                      selected={selectedClueId === clue.id}
                      onSelect={() => onSelectClue(category.id, clue.id)}
                      onEdit={() => onEditClue(category.id, clue.id)}
                    />
                    {canRemoveClue && (
                      <button
                        type="button"
                        className="clue-remove-btn"
                        aria-label={`Remove ${clue.value} point tile from ${category.name}`}
                        title="Remove tile"
                        onClick={() => onRemoveClue(category.id, clue.id)}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {canAddClue && (
                <button
                  type="button"
                  className="btn btn-sm add-clue-btn"
                  onClick={() => onAddClue(category.id)}
                >
                  <Plus size={14} aria-hidden="true" />
                  Add tile
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
