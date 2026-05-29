import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ImportBoardButton } from '../components/import/ImportBoardButton';
import { BoardCard } from '../components/dashboard/BoardCard';
import { useBoards } from '../hooks/useBoards';
import './DashboardPage.css';

export function DashboardPage() {
  const { boards, createBoard } = useBoards();
  const navigate = useNavigate();

  const handleCreate = () => {
    const board = createBoard('Untitled Board');
    navigate(`/boards/${board.id}/edit`);
  };

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Create and manage your Jeopardy-style boards</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={handleCreate}>
            <Plus size={16} aria-hidden="true" />
            Create New Board
          </button>
          <ImportBoardButton />
        </div>
      </header>

      {boards.length === 0 ? (
        <div className="empty-state card">
          <h2>No boards yet</h2>
          <p>Create your first board or import one from a JSON backup.</p>
          <div className="empty-state-actions">
            <button type="button" className="btn btn-primary" onClick={handleCreate}>
              <Plus size={16} aria-hidden="true" />
              Create New Board
            </button>
            <ImportBoardButton />
          </div>
        </div>
      ) : (
        <section aria-label="Recent boards">
          <h2 className="section-title">Your boards</h2>
          <div className="board-grid">
            {boards
              .slice()
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 6)
              .map((board) => (
                <BoardCard key={board.id} board={board} />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
