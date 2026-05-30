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
import { TileTypePicker } from '../components/editor/TileTypePicker';
import { InspectorPanel } from '../components/editor/InspectorPanel';
import { findClue, getNextClue, addCategory, removeCategory, isTileEmpty } from '../lib/boardFactory';
import { createMiniGameTile } from '../lib/miniGame';
import {
  exportBoardBackup,
  exportBoardJson,
  openPrintableBoard,
} from '../lib/export';
import { getBoard } from '../lib/storage';
import type { Board, Clue } from '../types/board';
import { isMiniGameTile, isStandardClue } from '../types/board';
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

  const updateBoard = (updater: (b: Board) => Board) => {
    setBoard((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveBoard(next);
      return next;
    });
  };

  const handleSelectClue = (categoryId: string, clueId: string) => {
    const found = findClue(board, categoryId, clueId);
    if (!found) return;

    setSelectedCategoryId(categoryId);
    setSelectedClueId(clueId);

    if (isTileEmpty(found.clue, board) && isStandardClue(found.clue)) {
      setEditorMode('picker');
      return;
    }

    setEditorMode(isMiniGameTile(found.clue) ? 'miniGame' : 'clue');
  };

  const handlePickStandardClue = () => {
    setEditorMode('clue');
  };

  const handlePickMiniGame = () => {
    if (!selectedCategoryId || !selectedClueId) return;
    const found = findClue(board, selectedCategoryId, selectedClueId);
    if (!found) return;

    if (isStandardClue(found.clue) && (found.clue.clue.trim() || found.clue.answer.trim())) {
      if (!window.confirm('Convert this tile to a Mini Game? Existing clue text will be hidden but not deleted.')) {
        return;
      }
    }

    const mgTile = createMiniGameTile(found.clue.value);
    mgTile.id = found.clue.id;
    updateBoard((b) => ({
      ...b,
      categories: b.categories.map((cat) =>
        cat.id === selectedCategoryId
          ? { ...cat, clues: cat.clues.map((c) => (c.id === selectedClueId ? mgTile : c)) }
          : cat,
      ),
    }));
    setEditorMode('miniGame');
  };

  const handleSaveClue = (updated: Clue, goNext = false) => {
    if (!selectedCategoryId || !selectedClueId) return;

    let savedBoard: Board | null = null;
    updateBoard((b) => {
      savedBoard = {
        ...b,
        categories: b.categories.map((cat) =>
          cat.id === selectedCategoryId
            ? {
                ...cat,
                clues: cat.clues.map((c) => (c.id === selectedClueId ? { ...updated, type: 'clue' as const } : c)),
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
        const nextFound = findClue(savedBoard, next.categoryId, next.clueId);
        setEditorMode(nextFound && isMiniGameTile(nextFound.clue) ? 'miniGame' : 'clue');
      } else {
        setEditorMode('none');
      }
    } else {
      setEditorMode('none');
    }
  };

  const handleSaveMiniGame = (updated: Clue, close = true) => {
    if (!selectedCategoryId || !selectedClueId) return;
    updateBoard((b) => ({
      ...b,
      categories: b.categories.map((cat) =>
        cat.id === selectedCategoryId
          ? {
              ...cat,
              clues: cat.clues.map((c) =>
                c.id === selectedClueId
                  ? { ...updated, type: 'miniGame' as const, value: updated.miniGame?.pointValue ?? c.value }
                  : c,
              ),
            }
          : cat,
      ),
    }));
    if (close) setEditorMode('none');
    else setEditorMode('miniGame');
  };

  const closeEditor = () => setEditorMode('none');

  const handleDelete = () => {
    if (window.confirm(`Delete "${board.title}"?`)) {
      removeBoard(board.id);
      navigate('/boards');
    }
  };

  const handleDuplicate = () => {
    const copy = duplicate(board.id);
    if (copy) navigate(`/boards/${copy.id}/edit`);
    setMenuOpen(false);
  };

  const handleAddCategory = () => updateBoard((b) => addCategory(b));

  const handleRemoveCategory = (categoryId: string) => {
    const category = board.categories.find((c) => c.id === categoryId);
    if (!category) return;
    if (!window.confirm(`Remove the "${category.name}" column and all of its clues? This cannot be undone.`)) {
      return;
    }
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null);
      setSelectedClueId(null);
      setEditorMode('none');
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
    window.alert('No empty tiles available to duplicate into.');
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
            onCategoryNameChange={(categoryId, name) =>
              updateBoard((b) => ({
                ...b,
                categories: b.categories.map((c) => (c.id === categoryId ? { ...c, name } : c)),
              }))
            }
            onAddCategory={handleAddCategory}
            onRemoveCategory={handleRemoveCategory}
          />

          <section className="final-jeopardy-editor card">
            <h2>Final Jeopardy</h2>
            <div className="final-fields">
              <div className="field">
                <label className="label" htmlFor="fj-category">Category</label>
                <input id="fj-category" className="input" value={board.finalJeopardy.category} onChange={(e) => updateBoard((b) => ({ ...b, finalJeopardy: { ...b.finalJeopardy, category: e.target.value } }))} />
              </div>
              <div className="field">
                <label className="label" htmlFor="fj-clue">Clue</label>
                <textarea id="fj-clue" className="textarea" rows={2} value={board.finalJeopardy.clue} onChange={(e) => updateBoard((b) => ({ ...b, finalJeopardy: { ...b.finalJeopardy, clue: e.target.value } }))} />
              </div>
              <div className="field">
                <label className="label" htmlFor="fj-answer">Correct Answer</label>
                <input id="fj-answer" className="input" value={board.finalJeopardy.answer} onChange={(e) => updateBoard((b) => ({ ...b, finalJeopardy: { ...b.finalJeopardy, answer: e.target.value } }))} />
              </div>
            </div>
          </section>
        </div>

        <InspectorPanel
          board={board}
          selectedCategoryId={selectedCategoryId}
          selectedClueId={selectedClueId}
          onEditMiniGame={() => setEditorMode('miniGame')}
          onPreviewMiniGame={() => navigate(`/boards/${board.id}/preview?clue=${selectedClueId}`)}
          onDuplicateTile={handleDuplicateTile}
        />
      </div>

      {editorMode === 'picker' && selected && (
        <TileTypePicker
          pointValue={selected.clue.value}
          onSelectClue={handlePickStandardClue}
          onSelectMiniGame={handlePickMiniGame}
          onCancel={closeEditor}
        />
      )}

      {editorMode === 'clue' && selected && (
        <ClueEditor
          categoryName={selected.category.name}
          clue={selected.clue}
          onCancel={closeEditor}
          onSave={(c) => handleSaveClue(c, false)}
          onSaveAndNext={(c) => handleSaveClue(c, true)}
          onConvertToMiniGame={handlePickMiniGame}
        />
      )}

      {editorMode === 'miniGame' && selected && selected.clue.miniGame && (
        <MiniGameEditor
          board={board}
          categoryName={selected.category.name}
          clue={selected.clue}
          onCancel={closeEditor}
          onSave={(c) => handleSaveMiniGame(c, true)}
        />
      )}
    </div>
  );
}
