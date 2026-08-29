import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Palette, X } from 'lucide-react';
import type { Board, Category, Clue } from '../../types/board';
import { clueIdsInColumn, clueIdsInRow } from '../../lib/boardTheme';
import { useBoardThemeStyles } from '../../hooks/useBoardTheme';
import { GameBoardGrid } from '../../pages/PreviewPage';
import { BoardAppearanceEditor, type TilePaintSelectionScope } from './BoardAppearanceEditor';
import '../../pages/GameBoard.css';
import './BoardAppearanceModal.css';

type BoardUpdater = Board | ((board: Board) => Board);

function cloneBoard(board: Board): Board {
  return structuredClone(board);
}

interface BoardAppearanceModalProps {
  board: Board;
  selectedCategory?: Category | null;
  selectedClue?: Clue | null;
  onBoardChange: (update: BoardUpdater) => void;
  onClose: () => void;
}

export function BoardAppearanceModal({
  board,
  selectedCategory: initialCategory = null,
  selectedClue: initialClue = null,
  onBoardChange,
  onClose,
}: BoardAppearanceModalProps) {
  const [draftBoard, setDraftBoard] = useState<Board>(() => cloneBoard(board));
  const [paintCategoryId, setPaintCategoryId] = useState<string | null>(
    () => initialCategory?.id ?? null,
  );
  const [paintClueId, setPaintClueId] = useState<string | null>(() => initialClue?.id ?? null);
  const [selectionScope, setSelectionScope] = useState<TilePaintSelectionScope>('tile');
  const themeStyles = useBoardThemeStyles(draftBoard);

  const paintCategory =
    paintCategoryId
      ? draftBoard.categories.find((c) => c.id === paintCategoryId) ?? null
      : null;
  const paintClue =
    paintCategory && paintClueId
      ? paintCategory.clues.find((c) => c.id === paintClueId) ?? null
      : null;

  const rowIndex =
    paintCategory && paintClue
      ? paintCategory.clues.findIndex((c) => c.id === paintClue.id)
      : -1;

  const selectedClueIds = useMemo(() => {
    if (!paintCategoryId || !paintClueId) return new Set<string>();
    if (selectionScope === 'row' && rowIndex >= 0) {
      return new Set(clueIdsInRow(draftBoard, rowIndex));
    }
    if (selectionScope === 'column') {
      return new Set(clueIdsInColumn(draftBoard, paintCategoryId));
    }
    return new Set([paintClueId]);
  }, [draftBoard, paintCategoryId, paintClueId, rowIndex, selectionScope]);

  const updateDraftBoard = useCallback((update: BoardUpdater) => {
    setDraftBoard((current) => (typeof update === 'function' ? update(current) : update));
  }, []);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    onBoardChange(draftBoard);
    onClose();
  }, [draftBoard, onBoardChange, onClose]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleCancel]);

  return createPortal(
    <div
      className="modal-overlay board-appearance-overlay"
      onClick={handleCancel}
      role="presentation"
    >
      <div
        className="modal board-appearance-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="board-appearance-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header board-appearance-header">
          <div className="board-appearance-header-text">
            <Palette size={20} aria-hidden="true" />
            <div>
              <h2 id="board-appearance-title">Board Appearance</h2>
              <p className="board-appearance-subtitle">
                Preview changes here. Select a tile, expand to a row or column, then apply a color. Save to keep.
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Cancel" onClick={handleCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="board-appearance-layout">
          <div
            className="board-appearance-preview-pane board-themed"
            style={themeStyles}
            aria-label="Board preview"
          >
            <header className="game-top-bar board-appearance-preview-top-bar">
              <span className="board-appearance-preview-title">{draftBoard.title || 'Untitled board'}</span>
              <span className="board-appearance-preview-label">Live preview — click a tile to select</span>
            </header>
            <div className="board-appearance-preview-board">
              <GameBoardGrid
                board={draftBoard}
                selectedClueIds={selectedClueIds}
                onTileClick={(categoryId, clue) => {
                  setPaintCategoryId(categoryId);
                  setPaintClueId(clue.id);
                  setSelectionScope('tile');
                }}
              />
            </div>
            <footer className="team-dock board-appearance-preview-footer" aria-hidden="true">
              <span className="board-appearance-preview-footer-label">Team scores</span>
            </footer>
          </div>

          <div className="board-appearance-controls">
            <BoardAppearanceEditor
              embedded
              board={draftBoard}
              selectedCategory={paintCategory}
              selectedClue={paintClue}
              selectionScope={selectionScope}
              selectedClueIds={[...selectedClueIds]}
              onSelectionScopeChange={setSelectionScope}
              onBoardChange={updateDraftBoard}
              onApplyCategoryStyleToAll={(style) =>
                updateDraftBoard((current) => ({
                  ...current,
                  categories: current.categories.map((c) => ({ ...c, style: { ...style } })),
                }))
              }
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={handleCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
