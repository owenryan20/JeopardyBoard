import { BoardCard } from '../components/dashboard/BoardCard';
import { useBoards } from '../hooks/useBoards';
import './DashboardPage.css';

export function RecentlyPlayedPage() {
  const { recentBoards } = useBoards();

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div>
          <h1>Recently Played</h1>
          <p className="page-subtitle">Boards you've started in game mode</p>
        </div>
      </header>

      {recentBoards.length === 0 ? (
        <div className="empty-state card">
          <h2>No recent games</h2>
          <p>Start a game from any board and it will appear here.</p>
        </div>
      ) : (
        <div className="board-grid">
          {recentBoards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}
    </div>
  );
}
