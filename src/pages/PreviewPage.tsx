import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CharacterGuessPanel } from '../components/minigame/CharacterGuessPanel';
import { ClueMedia } from '../components/clue/ClueMedia';
import type { Board, Clue } from '../types/board';
import { isMiniGameTile } from '../types/board';
import { formatPeso } from '../lib/currency';
import { findClue } from '../lib/boardFactory';
import { hasClueMedia } from '../lib/mediaUtils';
import { getBoard } from '../lib/storage';
import './GameBoard.css';

export function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(() => (id ? getBoard(id) ?? null : null));
  const [revealed, setRevealed] = useState<{ categoryId: string; clueId: string } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    if (!id) return;
    const loaded = getBoard(id);
    if (!loaded) navigate('/boards');
    else setBoard(loaded);
  }, [id, navigate]);

  useEffect(() => {
    const clueId = searchParams.get('clue');
    if (!board || !clueId) return;
    for (const cat of board.categories) {
      const clue = cat.clues.find((c) => c.id === clueId);
      if (clue) {
        setRevealed({ categoryId: cat.id, clueId: clue.id });
        break;
      }
    }
  }, [board, searchParams]);

  if (!board) return <div className="game-screen"><p>Loading…</p></div>;

  const activeClue =
    revealed && findClue(board, revealed.categoryId, revealed.clueId);

  const isMiniGame = activeClue && isMiniGameTile(activeClue.clue);

  return (
    <div className="game-screen preview-screen">
      <header className="game-top-bar">
        <h1>{board.title}</h1>
        <div className="game-top-actions">
          <Link to={`/boards/${board.id}/edit`} className="btn">
            Back to Editor
          </Link>
          <Link to={`/boards/${board.id}/game`} className="btn btn-primary">
            Start Game
          </Link>
        </div>
      </header>

      <div className="game-board-wrap">
        <GameBoardGrid
          board={board}
          onTileClick={(categoryId, clue) => {
            setRevealed({ categoryId, clueId: clue.id });
            setShowAnswer(false);
          }}
        />
      </div>

      {activeClue && isMiniGame && (
        <div className="clue-overlay cg-overlay" role="dialog" aria-modal="true">
          <CharacterGuessPanel
            board={board}
            categoryName={activeClue.category.name}
            clue={activeClue.clue}
            mode="preview"
            onClose={() => {
              setRevealed(null);
              setShowAnswer(false);
            }}
            onBackToBoard={() => {
              setRevealed(null);
              setShowAnswer(false);
            }}
          />
        </div>
      )}

      {activeClue && !isMiniGame && (
        <ClueOverlay
          categoryName={activeClue.category.name}
          clue={activeClue.clue}
          showAnswer={showAnswer}
          preview
          onClose={() => {
            setRevealed(null);
            setShowAnswer(false);
          }}
          onShowAnswer={() => setShowAnswer(true)}
        />
      )}
    </div>
  );
}

export function GameBoardGrid({
  board,
  onTileClick,
  usedClueIds,
}: {
  board: Board;
  onTileClick: (categoryId: string, clue: Clue) => void;
  usedClueIds?: Set<string>;
}) {
  const rowCount = board.categories[0]?.clues.length ?? 0;
  const gridStyle = { '--board-cols': board.categories.length } as CSSProperties;

  return (
    <div className="game-board" style={gridStyle} role="grid" aria-label="Game board">
      <div className="game-categories" role="row">
        {board.categories.map((cat) => (
          <div key={cat.id} className="game-category" role="columnheader">
            {cat.name}
          </div>
        ))}
      </div>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <div key={rowIndex} className="game-row" role="row">
          {board.categories.map((cat) => {
            const clue = cat.clues[rowIndex];
            if (!clue) return null;
            const used = usedClueIds?.has(clue.id) ?? clue.isUsed;
            return (
              <button
                key={clue.id}
                type="button"
                className={`game-tile${used ? ' game-tile-used' : ''}`}
                role="gridcell"
                disabled={used}
                aria-label={`${cat.name}, ${clue.value} points${used ? ', already used' : ''}`}
                onClick={() => !used && onTileClick(cat.id, clue)}
              >
                {!used && <span className="game-value">{clue.value}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function ClueOverlay({
  categoryName,
  clue,
  showAnswer,
  preview,
  onClose,
  onShowAnswer,
  onMarkUsed,
  clueValue,
  teams,
  onScoreTeam,
  teamScoreSelections = {},
}: {
  categoryName: string;
  clue: Clue;
  showAnswer: boolean;
  preview?: boolean;
  onClose: () => void;
  onShowAnswer: () => void;
  onMarkUsed?: () => void;
  clueValue?: number;
  teams?: { id: string; name: string; score: number }[];
  onScoreTeam?: (teamId: string, delta: number) => void;
  teamScoreSelections?: Record<string, 'add' | 'subtract'>;
}) {
  const value = clueValue ?? clue.value;

  return (
    <div className="clue-overlay" role="dialog" aria-modal="true" aria-labelledby="clue-overlay-title">
      <div className="clue-overlay-panel">
        <p className="clue-overlay-category">{categoryName}</p>
        <p className="clue-overlay-value game-value">{formatPeso(value)}</p>
        {clue.isDailyDouble && <span className="badge badge-dd">Daily Double</span>}
        <h2 id="clue-overlay-title" className="clue-overlay-text">
          {clue.clue || '(No clue text)'}
        </h2>
        {hasClueMedia(clue.media) && clue.media && <ClueMedia media={clue.media} />}
        {showAnswer && (
          <p className="clue-overlay-answer">
            <strong>Answer:</strong> {clue.answer || '(No answer)'}
          </p>
        )}
        <div className="clue-overlay-actions">
          {!showAnswer && (
            <button type="button" className="btn btn-primary" onClick={onShowAnswer}>
              Show Answer
            </button>
          )}
          {!preview && showAnswer && onMarkUsed && (
            <button type="button" className="btn btn-primary" onClick={onMarkUsed}>
              Mark as Used
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        {!preview && showAnswer && teams && onScoreTeam && (
          <div className="score-quick-actions">
            <p>Apply score — click selected again to undo:</p>
            {teams.map((team) => {
              const selection = teamScoreSelections[team.id];
              const scored = selection != null;
              return (
                <div key={team.id} className="score-team-row">
                  <span>{team.name}</span>
                  <div className="score-team-buttons" role="group" aria-label={`Score for ${team.name}`}>
                    <button
                      type="button"
                      className={`btn btn-sm score-btn-add${selection === 'add' ? ' score-btn-selected' : ''}`}
                      disabled={scored && selection !== 'add'}
                      aria-pressed={selection === 'add'}
                      aria-label={
                        selection === 'add'
                          ? `Undo ${value} points for ${team.name}`
                          : `Award ${value} points to ${team.name}`
                      }
                      onClick={() => onScoreTeam(team.id, value)}
                    >
                      +{value}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm score-btn-subtract${selection === 'subtract' ? ' score-btn-selected' : ''}`}
                      disabled={scored && selection !== 'subtract'}
                      aria-pressed={selection === 'subtract'}
                      aria-label={
                        selection === 'subtract'
                          ? `Undo −${value} points for ${team.name}`
                          : `Deduct ${value} points from ${team.name}`
                      }
                      onClick={() => onScoreTeam(team.id, -value)}
                    >
                      −{value}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
