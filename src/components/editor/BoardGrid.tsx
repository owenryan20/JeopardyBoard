import { useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CSSProperties, DragEvent } from 'react';
import type { Board } from '../../types/board';
import { MAX_CATEGORY_COUNT, MAX_CLUES_PER_CATEGORY, MIN_CATEGORY_COUNT, MIN_CLUES_PER_CATEGORY } from '../../types/board';
import { getCategoryHeaderStyle } from '../../lib/boardTheme';
import type { TileDropMode, TilePosition } from '../../lib/boardFactory';
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
  onRelocateTile: (from: TilePosition, to: TilePosition, mode: TileDropMode) => void;
  onMoveTileToCategoryEnd: (from: TilePosition, targetCategoryId: string) => void;
}

type DropTarget =
  | { kind: 'tile'; categoryId: string; clueId: string; mode: TileDropMode }
  | { kind: 'column-end'; categoryId: string };

const EDGE_ZONE = 0.28;

function dropModeFromPointer(clientY: number, element: HTMLElement): TileDropMode {
  const rect = element.getBoundingClientRect();
  if (rect.height <= 0) return 'swap';
  const ratio = (clientY - rect.top) / rect.height;
  if (ratio < EDGE_ZONE) return 'insert-before';
  if (ratio > 1 - EDGE_ZONE) return 'insert-after';
  return 'swap';
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
  onRelocateTile,
  onMoveTileToCategoryEnd,
}: BoardGridProps) {
  const columnCount = board.categories.length;
  const themeStyles = useBoardThemeStyles(board);
  const gridStyle = { '--board-cols': columnCount, ...themeStyles } as CSSProperties;
  const canAddCategory = columnCount < MAX_CATEGORY_COUNT;
  const canRemoveCategory = columnCount > MIN_CATEGORY_COUNT;

  const [dragging, setDragging] = useState<TilePosition | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const dragStartedRef = useRef(false);

  const clearDrag = () => {
    setDragging(null);
    setDropTarget(null);
    dragStartedRef.current = false;
  };

  const handleTileDragStart = (event: DragEvent, categoryId: string, clueId: string) => {
    dragStartedRef.current = true;
    setDragging({ categoryId, clueId });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${categoryId}:${clueId}`);
  };

  const handleTileDragOver = (event: DragEvent, categoryId: string, clueId: string) => {
    if (!dragging) return;
    if (dragging.categoryId === categoryId && dragging.clueId === clueId) {
      setDropTarget(null);
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const mode = dropModeFromPointer(event.clientY, event.currentTarget as HTMLElement);
    setDropTarget({ kind: 'tile', categoryId, clueId, mode });
  };

  const handleTileDrop = (event: DragEvent, categoryId: string, clueId: string) => {
    event.preventDefault();
    if (!dragging) return;
    if (dragging.categoryId === categoryId && dragging.clueId === clueId) {
      clearDrag();
      return;
    }
    const mode =
      dropTarget?.kind === 'tile'
      && dropTarget.categoryId === categoryId
      && dropTarget.clueId === clueId
        ? dropTarget.mode
        : dropModeFromPointer(event.clientY, event.currentTarget as HTMLElement);
    onRelocateTile(dragging, { categoryId, clueId }, mode);
    clearDrag();
  };

  const handleColumnEndDragOver = (event: DragEvent, categoryId: string) => {
    if (!dragging) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTarget({ kind: 'column-end', categoryId });
  };

  const handleColumnEndDrop = (event: DragEvent, categoryId: string) => {
    event.preventDefault();
    if (!dragging) return;
    onMoveTileToCategoryEnd(dragging, categoryId);
    clearDrag();
  };

  return (
    <div className={`board-grid-editor${dragging ? ' board-grid-dragging' : ''}`} style={gridStyle}>
      <div className="board-grid-toolbar">
        <span className="board-grid-meta">
          {columnCount} categor{columnCount === 1 ? 'y' : 'ies'}
          {dragging ? ' · Drop on a tile to swap, or on an edge to shift' : ''}
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
          const canAcceptCrossInsert =
            dragging
            && (
              dragging.categoryId === category.id
              || (
                category.clues.length < MAX_CLUES_PER_CATEGORY
                && (board.categories.find((c) => c.id === dragging.categoryId)?.clues.length ?? 0)
                  > MIN_CLUES_PER_CATEGORY
              )
            );

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
                {category.clues.map((clue) => {
                  const isDragSource =
                    dragging?.categoryId === category.id && dragging.clueId === clue.id;
                  const tileDrop =
                    dropTarget?.kind === 'tile'
                    && dropTarget.categoryId === category.id
                    && dropTarget.clueId === clue.id
                      ? dropTarget.mode
                      : null;

                  return (
                    <div
                      key={clue.id}
                      className={[
                        'board-grid-tile-wrap',
                        isDragSource ? 'board-grid-tile-dragging' : '',
                        tileDrop === 'swap' ? 'board-grid-tile-drop-swap' : '',
                        tileDrop === 'insert-before' ? 'board-grid-tile-drop-before' : '',
                        tileDrop === 'insert-after' ? 'board-grid-tile-drop-after' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onDragOver={(e) => handleTileDragOver(e, category.id, clue.id)}
                      onDragLeave={() => {
                        setDropTarget((current) =>
                          current?.kind === 'tile'
                          && current.categoryId === category.id
                          && current.clueId === clue.id
                            ? null
                            : current,
                        );
                      }}
                      onDrop={(e) => handleTileDrop(e, category.id, clue.id)}
                    >
                      <BoardTile
                        board={board}
                        clue={clue}
                        selected={selectedClueId === clue.id}
                        draggable
                        onDragStart={(e) => handleTileDragStart(e, category.id, clue.id)}
                        onDragEnd={clearDrag}
                        onSelect={() => {
                          if (dragStartedRef.current) {
                            dragStartedRef.current = false;
                            return;
                          }
                          onSelectClue(category.id, clue.id);
                        }}
                        onEdit={() => onEditClue(category.id, clue.id)}
                      />
                      {canRemoveClue && (
                        <button
                          type="button"
                          className="clue-remove-btn"
                          aria-label={`Remove ${clue.value} point tile from ${category.name}`}
                          title="Remove tile"
                          draggable={false}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => onRemoveClue(category.id, clue.id)}
                        >
                          <Trash2 size={12} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {dragging && canAcceptCrossInsert && (
                  <div
                    className={`board-grid-column-end-drop${
                      dropTarget?.kind === 'column-end' && dropTarget.categoryId === category.id
                        ? ' board-grid-column-end-drop-active'
                        : ''
                    }`}
                    onDragOver={(e) => handleColumnEndDragOver(e, category.id)}
                    onDragLeave={() => {
                      setDropTarget((current) =>
                        current?.kind === 'column-end' && current.categoryId === category.id
                          ? null
                          : current,
                      );
                    }}
                    onDrop={(e) => handleColumnEndDrop(e, category.id)}
                    aria-hidden="true"
                  />
                )}
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
