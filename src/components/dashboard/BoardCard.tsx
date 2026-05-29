import {
  Copy,
  Download,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Board } from '../../types/board';
import { getAllClues } from '../../lib/boardFactory';
import { exportBoardJson } from '../../lib/export';
import { useBoards } from '../../hooks/useBoards';
import './BoardCard.css';

interface BoardCardProps {
  board: Board;
}

export function BoardCard({ board }: BoardCardProps) {
  const navigate = useNavigate();
  const { duplicate, removeBoard } = useBoards();
  const clueCount = getAllClues(board).length;
  const categoryCount = board.categories.length;
  const edited = new Date(board.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="board-card card">
      <div className="board-card-thumb" aria-hidden="true">
        <div className="board-card-mini-grid">
          {board.categories.slice(0, 6).map((cat) => (
            <div key={cat.id} className="board-card-mini-col">
              <span>{cat.name.slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="board-card-body">
        <h3 className="board-card-title">{board.title}</h3>
        <p className="board-card-meta">
          {categoryCount} categories · {clueCount} clues
        </p>
        <p className="board-card-date">Last edited {edited}</p>
        <div className="board-card-actions">
          <button
            type="button"
            className="btn btn-sm btn-ghost btn-icon"
            aria-label={`Edit ${board.title}`}
            onClick={() => navigate(`/boards/${board.id}/edit`)}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost btn-icon"
            aria-label={`Play ${board.title}`}
            onClick={() => navigate(`/boards/${board.id}/game`)}
          >
            <Play size={16} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost btn-icon"
            aria-label={`Duplicate ${board.title}`}
            onClick={() => {
              const copy = duplicate(board.id);
              if (copy) navigate(`/boards/${copy.id}/edit`);
            }}
          >
            <Copy size={16} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost btn-icon"
            aria-label={`Export ${board.title} as JSON`}
            onClick={() => exportBoardJson(board)}
          >
            <Download size={16} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost btn-icon btn-danger"
            aria-label={`Delete ${board.title}`}
            onClick={() => {
              if (window.confirm(`Delete "${board.title}"? This cannot be undone.`)) {
                removeBoard(board.id);
              }
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
