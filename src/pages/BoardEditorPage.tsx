import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Eye,
  FileJson,
  MoreHorizontal,
  Pencil,
  Play,
  Printer,
  Trash2,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BoardGrid } from '../components/editor/BoardGrid';
import { ClueEditor } from '../components/editor/ClueEditor';
import { MiniGameEditor } from '../components/editor/MiniGameEditor';
import { CropRevealEditor } from '../components/minigame/CropRevealEditor';
import { TileTypePicker } from '../components/editor/TileTypePicker';
import { InspectorPanel } from '../components/editor/InspectorPanel';
import { FinalJeopardyRainbowWrap } from '../components/game/FinalJeopardyRainbowWrap';
import { findClue, getNextClue, addCategory, removeCategory, addClueToCategory, removeClueFromCategory, canResetTile, isTileEmpty, resetClueTile } from '../lib/boardFactory';
import { FINAL_JEOPARDY_TILE_ID } from '../lib/finalJeopardy';
import { BoardTile } from '../components/editor/BoardTile';
import { alertDialog, confirmDialog } from '../lib/dialog';
import { createCropRevealTile, createMiniGameTile } from '../lib/miniGame';
import {
  exportBoardBackup,
  exportBoardJson,
  openPrintableBoard,
} from '../lib/export';
import { getBoard } from '../lib/storage';
import type { Board, Clue } from '../types/board';
import { MIN_CLUES_PER_CATEGORY } from '../types/board';
import { isCropRevealTile, isMiniGameTile, isStandardClue } from '../types/board';
import { deleteMediaIfUnreferenced } from '../lib/mediaStorage';
import { isLocalMedia } from '../lib/mediaUtils';
import { useAutosave } from '../hooks/useAutosave';
import { useBoards } from '../hooks/useBoards';
import './BoardEditorPage.css';

type EditorMode = 'none' | 'picker' | 'clue' | 'miniGame';

export function BoardEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { saveBoard, removeBoard, duplicate } = useBoards();
  const [board, setBoard] = useState<Board | null>(() => (id ? getBoard(id) ?? null : null));
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedClueId, setSelectedClueId] = useState<string | null>(null);
  const [finalSelected, setFinalSelected] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('none');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { label: saveLabel } = useAutosave(board);

  useEffect(() => {
    if (!id) return;
    const loaded = getBoard(id);
    if (!loaded) {
      navigate('/boards');
      return;
    }
    setBoard(loaded);
  }, [id, navigate]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (board) saveBoard(board);
  }, [board, saveBoard]);

  if (!board) {
    return (
      <div className="page">
        <p>Loading board…</p>
      </div>
    );
  }

  const selected =
    selectedCategoryId && selectedClueId
      ? findClue(board, selectedCategoryId, selectedClueId)
      : null;

  const activeEditorClue = finalSelected
    ? {
        category: { name: board.finalJeopardy.category || 'Final Jeopardy' },
        clue: board.finalJeopardy.tile,
      }
    : selected;

  const clearSelection = () => {
    setSelectedCategoryId(null);
    setSelectedClueId(null);
    setFinalSelected(false);
    setEditorMode('none');
  };

  const openEditorForClue = (clue: Clue) => {
    if (isTileEmpty(clue, board) && isStandardClue(clue)) {
      setEditorMode('picker');
      return;
    }
    setEditorMode(isMiniGameTile(clue) ? 'miniGame' : 'clue');
  };

  const updateBoard = (updater: (b: Board) => Board) => {
    setBoard((prev) => {
      if (!prev) return prev;
      return updater(prev);
    });
  };

  const updateFinalCategory = (category: string) => {
    updateBoard((b) => ({
      ...b,
      finalJeopardy: { ...b.finalJeopardy, category },
    }));
  };

  const handleSelectClue = (categoryId: string, clueId: string) => {
    const found = findClue(board, categoryId, clueId);
    if (!found) return;

    setFinalSelected(false);
    setSelectedCategoryId(categoryId);
    setSelectedClueId(clueId);

    if (isTileEmpty(found.clue, board)) {
      openEditorForClue(found.clue);
    }
  };

  const handleSelectFinal = () => {
    setFinalSelected(true);
    setSelectedCategoryId(null);
    setSelectedClueId(null);

    if (isTileEmpty(board.finalJeopardy.tile, board)) {
      openEditorForClue(board.finalJeopardy.tile);
    }
  };

  const handleEditClue = (categoryId: string, clueId: string) => {
    const found = findClue(board, categoryId, clueId);
    if (!found || isTileEmpty(found.clue, board)) return;

    setFinalSelected(false);
    setSelectedCategoryId(categoryId);
    setSelectedClueId(clueId);
    openEditorForClue(found.clue);
  };

  const handleEditFinal = () => {
    if (isTileEmpty(board.finalJeopardy.tile, board)) return;

    setFinalSelected(true);
    setSelectedCategoryId(null);
    setSelectedClueId(null);
    openEditorForClue(board.finalJeopardy.tile);
  };

  const handleEditSelectedTile = () => {
    if (finalSelected) {
      openEditorForClue(board.finalJeopardy.tile);
      return;
    }
    if (selected) {
      openEditorForClue(selected.clue);
    }
  };

  const handlePickStandardClue = () => {
    setEditorMode('clue');
  };

  const applyMiniGameTile = (mgTile: Clue) => {
    if (finalSelected) {
      updateBoard((b) => ({
        ...b,
        finalJeopardy: { ...b.finalJeopardy, tile: mgTile },
      }));
    } else if (selectedCategoryId && selectedClueId) {
      updateBoard((b) => ({
        ...b,
        categories: b.categories.map((cat) =>
          cat.id === selectedCategoryId
            ? { ...cat, clues: cat.clues.map((c) => (c.id === selectedClueId ? mgTile : c)) }
            : cat,
        ),
      }));
    }
    setEditorMode('miniGame');
  };

  const confirmConvertToMiniGame = async (): Promise<boolean> => {
    if (!activeEditorClue) return false;
    if (
      isStandardClue(activeEditorClue.clue)
      && (activeEditorClue.clue.clue.trim() || activeEditorClue.clue.answer.trim())
    ) {
      return confirmDialog({
        title: 'Convert to Mini Game?',
        description: 'Existing clue text will be hidden but not deleted.',
        confirmLabel: 'Convert',
      });
    }
    return true;
  };

  const handlePickCharacterGuess = async () => {
    if (!activeEditorClue) return;
    if (!(await confirmConvertToMiniGame())) return;
    const mgTile = createMiniGameTile(finalSelected ? 0 : activeEditorClue.clue.value);
    mgTile.id = activeEditorClue.clue.id;
    applyMiniGameTile(mgTile);
  };

  const handlePickCropReveal = async () => {
    if (!activeEditorClue) return;
    if (!(await confirmConvertToMiniGame())) return;
    const mgTile = createCropRevealTile(finalSelected ? 0 : activeEditorClue.clue.value);
    mgTile.id = activeEditorClue.clue.id;
    applyMiniGameTile(mgTile);
  };

  const closeEditor = () => clearSelection();

  const handleSaveClue = (updated: Clue, goNext = false) => {
    const savedClue = {
      ...updated,
      type: 'clue' as const,
      value: finalSelected ? 0 : updated.value,
      id: finalSelected ? FINAL_JEOPARDY_TILE_ID : updated.id,
      isDailyDouble: finalSelected ? false : updated.isDailyDouble,
    };

    if (finalSelected) {
      updateBoard((b) => ({
        ...b,
        finalJeopardy: { ...b.finalJeopardy, tile: savedClue },
      }));
      closeEditor();
      return;
    }

    if (!selectedCategoryId || !selectedClueId) return;

    let savedBoard: Board | null = null;
    updateBoard((b) => {
      savedBoard = {
        ...b,
        categories: b.categories.map((cat) =>
          cat.id === selectedCategoryId
            ? {
                ...cat,
                clues: cat.clues.map((c) => (c.id === selectedClueId ? savedClue : c)),
              }
            : cat,
        ),
      };
      return savedBoard;
    });

    if (goNext && savedBoard) {
      const next = getNextClue(savedBoard, selectedCategoryId, selectedClueId);
      if (next) {
        setSelectedCategoryId(next.categoryId);
        setSelectedClueId(next.clueId);
        setFinalSelected(false);
        const nextFound = findClue(savedBoard, next.categoryId, next.clueId);
        if (nextFound && isTileEmpty(nextFound.clue, savedBoard)) {
          openEditorForClue(nextFound.clue);
        } else {
          setEditorMode('none');
        }
      } else {
        closeEditor();
      }
    } else {
      closeEditor();
    }
  };

  const handleSaveMiniGame = (updated: Clue, close = true) => {
    const savedClue = {
      ...updated,
      type: 'miniGame' as const,
      value: finalSelected ? 0 : (updated.miniGame?.pointValue ?? updated.value),
      id: finalSelected ? FINAL_JEOPARDY_TILE_ID : updated.id,
    };

    if (finalSelected) {
      updateBoard((b) => ({
        ...b,
        finalJeopardy: { ...b.finalJeopardy, tile: savedClue },
      }));
    } else if (selectedCategoryId && selectedClueId) {
      updateBoard((b) => ({
        ...b,
        categories: b.categories.map((cat) =>
          cat.id === selectedCategoryId
            ? {
                ...cat,
                clues: cat.clues.map((c) =>
                  c.id === selectedClueId ? savedClue : c,
                ),
              }
            : cat,
        ),
      }));
    }

    if (close) closeEditor();
    else setEditorMode('miniGame');
  };

  const handleResetTile = async () => {
    const clue = finalSelected
      ? board.finalJeopardy.tile
      : selected?.clue;
    if (!clue || !canResetTile(clue, board)) return;

    const ok = await confirmDialog({
      title: finalSelected ? 'Reset Final Jeopardy?' : 'Reset this tile?',
      description: finalSelected
        ? 'Clue content, attachments, and mini game setup will be cleared.'
        : 'Clue text, attachments, mini game setup, and Daily Double will be cleared. The point value stays the same.',
      confirmLabel: 'Reset',
      variant: 'destructive',
      closeOnBackdrop: false,
    });
    if (!ok) return;

    const previousMediaId =
      clue.media && isLocalMedia(clue.media) ? clue.media.mediaId : undefined;

    const reset = finalSelected
      ? { ...resetClueTile(clue), id: FINAL_JEOPARDY_TILE_ID, value: 0 }
      : resetClueTile(clue);

    if (finalSelected) {
      updateBoard((b) => ({
        ...b,
        finalJeopardy: { ...b.finalJeopardy, tile: reset },
      }));
    } else if (selectedCategoryId && selectedClueId) {
      updateBoard((b) => ({
        ...b,
        categories: b.categories.map((cat) =>
          cat.id === selectedCategoryId
            ? {
                ...cat,
                clues: cat.clues.map((c) => (c.id === selectedClueId ? reset : c)),
              }
            : cat,
        ),
      }));
    }

    if (previousMediaId) {
      void deleteMediaIfUnreferenced(previousMediaId);
    }

    closeEditor();
  };

  const handleAddClue = (categoryId: string) => {
    updateBoard((b) => addClueToCategory(b, categoryId));
  };

  const handleRemoveClue = async (categoryId: string, clueId: string) => {
    const ok = await confirmDialog({
      title: 'Remove tile?',
      description: 'Remove this tile from the category?',
      confirmLabel: 'Remove',
      variant: 'destructive',
      closeOnBackdrop: false,
    });
    if (!ok) return;
    const found = findClue(board, categoryId, clueId);
    const previousMediaId =
      found?.clue.media && isLocalMedia(found.clue.media) ? found.clue.media.mediaId : undefined;
    const next = removeClueFromCategory(board, categoryId, clueId);
    if (!next) return;
    updateBoard(() => next);
    if (selectedCategoryId === categoryId && selectedClueId === clueId) {
      clearSelection();
    }
    if (previousMediaId) {
      void deleteMediaIfUnreferenced(previousMediaId);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: `Delete "${board.title}"?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'destructive',
      closeOnBackdrop: false,
    });
    if (!ok) return;
    removeBoard(board.id);
    navigate('/boards');
  };

  const handleDuplicate = () => {
    const copy = duplicate(board.id);
    if (copy) navigate(`/boards/${copy.id}/edit`);
    setMenuOpen(false);
  };

  const handleAddCategory = () => updateBoard((b) => addCategory(b));

  const handleRemoveCategory = async (categoryId: string) => {
    const category = board.categories.find((c) => c.id === categoryId);
    if (!category) return;
    const ok = await confirmDialog({
      title: `Remove "${category.name}"?`,
      description: 'This column and all of its clues will be removed. This cannot be undone.',
      confirmLabel: 'Remove',
      variant: 'destructive',
      closeOnBackdrop: false,
    });
    if (!ok) return;
    if (selectedCategoryId === categoryId) {
      clearSelection();
    }
    updateBoard((b) => removeCategory(b, categoryId));
  };

  const handleDuplicateTile = () => {
    if (!selectedCategoryId || !selectedClueId) return;
    const source = findClue(board, selectedCategoryId, selectedClueId);
    if (!source?.clue.miniGame || !isMiniGameTile(source.clue)) return;

    for (const cat of board.categories) {
      for (const clue of cat.clues) {
        if (clue.id === selectedClueId) continue;
        if (isTileEmpty(clue, board)) {
          const copy: Clue = {
            ...createMiniGameTile(clue.value),
            id: clue.id,
            miniGame: JSON.parse(JSON.stringify(source.clue.miniGame)),
          };
          updateBoard((b) => ({
            ...b,
            categories: b.categories.map((c) =>
              c.id === cat.id
                ? { ...c, clues: c.clues.map((cl) => (cl.id === clue.id ? copy : cl)) }
                : c,
            ),
          }));
          setSelectedCategoryId(cat.id);
          setSelectedClueId(clue.id);
          return;
        }
      }
    }
    void alertDialog({
      title: 'No empty tiles',
      description: 'No empty tiles available to duplicate into.',
    });
  };

  return (
    <div className="editor-layout">
      <header className="editor-header">
        <div className="editor-header-left">
          {editingTitle ? (
            <input
              className="editor-title-input"
              value={board.title}
              autoFocus
              aria-label="Board title"
              onChange={(e) => updateBoard((b) => ({ ...b, title: e.target.value }))}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
            />
          ) : (
            <h1 className="editor-title">
              {board.title}
              <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Edit board title" onClick={() => setEditingTitle(true)}>
                <Pencil size={16} />
              </button>
            </h1>
          )}
          <span className="save-status">
            <Check size={14} aria-hidden="true" />
            {saveLabel}
          </span>
        </div>
        <div className="editor-header-actions">
          <Link to={`/boards/${board.id}/preview`} className="btn">
            <Eye size={16} aria-hidden="true" />
            Preview
          </Link>
          <Link to={`/boards/${board.id}/game`} className="btn btn-primary">
            <Play size={16} aria-hidden="true" />
            Start Game
          </Link>
          <div className="dropdown" ref={menuRef}>
            <button type="button" className="btn btn-icon" aria-label="More actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div className="dropdown-menu" role="menu">
                <button type="button" className="dropdown-item" role="menuitem" onClick={() => { exportBoardJson(board); setMenuOpen(false); }}>
                  <FileJson size={16} /> Export as JSON
                </button>
                <button type="button" className="dropdown-item" role="menuitem" onClick={() => { openPrintableBoard(board); setMenuOpen(false); }}>
                  <Printer size={16} /> Export Printable Board
                </button>
                <button type="button" className="dropdown-item" role="menuitem" onClick={() => { exportBoardBackup(board); setMenuOpen(false); }}>
                  <Download size={16} /> Download Backup
                </button>
                <button type="button" className="dropdown-item" role="menuitem" onClick={handleDuplicate}>
                  <Copy size={16} /> Duplicate Board
                </button>
                <button type="button" className="dropdown-item dropdown-item-danger" role="menuitem" onClick={handleDelete}>
                  <Trash2 size={16} /> Delete Board
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="editor-body">
        <div className="editor-main">
          <BoardGrid
            board={board}
            selectedClueId={selectedClueId}
            onSelectClue={handleSelectClue}
            onEditClue={handleEditClue}
            onCategoryNameChange={(categoryId, name) =>
              updateBoard((b) => ({
                ...b,
                categories: b.categories.map((c) => (c.id === categoryId ? { ...c, name } : c)),
              }))
            }
            onAddCategory={handleAddCategory}
            onRemoveCategory={handleRemoveCategory}
            onAddClue={handleAddClue}
            onRemoveClue={handleRemoveClue}
          />

          <section className="final-jeopardy-editor card">
            <h2>Final Jeopardy</h2>
            <p className="field-hint final-jeopardy-hint">
              Set the category name, then click the tile to add a clue, media, or mini game — same as board tiles.
            </p>
            <div className="field">
              <label className="label" htmlFor="fj-category">Category</label>
              <input
                id="fj-category"
                className="input"
                value={board.finalJeopardy.category}
                onChange={(e) =>
                  updateBoard((b) => ({
                    ...b,
                    finalJeopardy: { ...b.finalJeopardy, category: e.target.value },
                  }))
                }
              />
            </div>
            <FinalJeopardyRainbowWrap className="fj-rainbow-wrap-block final-jeopardy-tile-wrap">
              <BoardTile
                board={board}
                clue={board.finalJeopardy.tile}
                selected={finalSelected}
                showValue={false}
                compact
                onSelect={handleSelectFinal}
                onEdit={handleEditFinal}
              />
            </FinalJeopardyRainbowWrap>
          </section>
        </div>

        <InspectorPanel
          board={board}
          selectedCategoryId={selectedCategoryId}
          selectedClueId={selectedClueId}
          finalSelected={finalSelected}
          onBoardChange={(update) => {
            if (typeof update === 'function') {
              updateBoard(update);
            } else {
              updateBoard(() => update);
            }
          }}
          onEditTile={handleEditSelectedTile}
          onPreviewMiniGame={() => {
            if (finalSelected) {
              navigate(`/boards/${board.id}/preview?final=1`);
            } else if (selectedClueId) {
              navigate(`/boards/${board.id}/preview?clue=${selectedClueId}`);
            }
          }}
          onDuplicateTile={handleDuplicateTile}
          onResetTile={handleResetTile}
          onRemoveClue={
            selectedCategoryId
            && selectedClueId
            && (board.categories.find((c) => c.id === selectedCategoryId)?.clues.length ?? 0) > MIN_CLUES_PER_CATEGORY
              ? () => handleRemoveClue(selectedCategoryId, selectedClueId)
              : undefined
          }
        />
      </div>

      {editorMode === 'picker' && activeEditorClue && (
        <TileTypePicker
          pointValue={finalSelected ? 0 : activeEditorClue.clue.value}
          onSelectClue={handlePickStandardClue}
          onSelectCharacterGuess={() => void handlePickCharacterGuess()}
          onSelectCropReveal={() => void handlePickCropReveal()}
          onCancel={closeEditor}
        />
      )}

      {editorMode === 'clue' && activeEditorClue && (
        <ClueEditor
          categoryName={activeEditorClue.category.name}
          clue={activeEditorClue.clue}
          variant={finalSelected ? 'final' : 'board'}
          finalCategory={board.finalJeopardy.category}
          onFinalCategoryChange={updateFinalCategory}
          onCancel={closeEditor}
          onSave={(c) => handleSaveClue(c, false)}
          onSaveAndNext={finalSelected ? (c) => handleSaveClue(c, false) : (c) => handleSaveClue(c, true)}
          onConvertToMiniGame={() => void handlePickCharacterGuess()}
          onReset={handleResetTile}
        />
      )}

      {editorMode === 'miniGame' && activeEditorClue && activeEditorClue.clue.miniGame && isCropRevealTile(activeEditorClue.clue) && (
        <CropRevealEditor
          board={board}
          categoryName={activeEditorClue.category.name}
          clue={activeEditorClue.clue}
          variant={finalSelected ? 'final' : 'board'}
          finalCategory={board.finalJeopardy.category}
          onFinalCategoryChange={updateFinalCategory}
          onCancel={closeEditor}
          onSave={(c) => handleSaveMiniGame(c, true)}
          onReset={() => void handleResetTile()}
        />
      )}

      {editorMode === 'miniGame' && activeEditorClue && activeEditorClue.clue.miniGame && !isCropRevealTile(activeEditorClue.clue) && (
        <MiniGameEditor
          board={board}
          categoryName={activeEditorClue.category.name}
          clue={activeEditorClue.clue}
          variant={finalSelected ? 'final' : 'board'}
          finalCategory={board.finalJeopardy.category}
          onFinalCategoryChange={updateFinalCategory}
          onCancel={closeEditor}
          onSave={(c) => handleSaveMiniGame(c, true)}
          onReset={() => void handleResetTile()}
        />
      )}
    </div>
  );
}
