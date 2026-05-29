import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BoardCard } from '../components/dashboard/BoardCard';
import { ImportBoardButton } from '../components/import/ImportBoardButton';
import { useBoards } from '../hooks/useBoards';
import './DashboardPage.css';

export function MyBoardsPage() {
  const { boards, createBoard } = useBoards();
  const navigate = useNavigate();

  const handleCreate = () => {
    const board = createBoard('Untitled Board');
    navigate(`/boards/${board.id}/edit`);
  };

  const sorted = boards
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div>
          <h1>My Boards</h1>
          <p className="page-subtitle">
            {boards.length} board{boards.length === 1 ? '' : 's'} saved locally
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={handleCreate}>
            <Plus size={16} aria-hidden="true" />
            Create New Board
          </button>
          <ImportBoardButton />
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="empty-state card">
          <h2>No boards yet</h2>
          <p>Your saved boards will appear here. Everything stays in your browser.</p>
          <div className="empty-state-actions">
            <button type="button" className="btn btn-primary" onClick={handleCreate}>
              Create New Board
            </button>
            <ImportBoardButton />
          </div>
        </div>
      ) : (
        <div className="board-grid">
          {sorted.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}
    </div>
  );
}
