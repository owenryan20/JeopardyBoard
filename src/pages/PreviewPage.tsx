import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CharacterGuessPanel } from '../components/minigame/CharacterGuessPanel';
import { CropRevealPanel } from '../components/minigame/CropRevealPanel';
import { ClueAttachments } from '../components/clue/ClueAttachments';
import { TeamScoreQuickActions } from '../components/game/TeamScoreQuickActions';
import type { Board, Clue } from '../types/board';
import { isCharacterGuessTile, isCropRevealTile } from '../types/board';
import { formatPeso } from '../lib/currency';
import { findClue } from '../lib/boardFactory';
import { hasAttachments } from '../lib/attachments';
import { getCategoryHeaderStyle } from '../lib/boardTheme';
import { useBoardThemeStyles } from '../hooks/useBoardTheme';
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
    const finalPreview = searchParams.get('final');
    if (!board) return;
    if (finalPreview === '1') {
      setRevealed({ categoryId: '__final__', clueId: board.finalJeopardy.tile.id });
      return;
    }
    if (!clueId) return;
    for (const cat of board.categories) {
      const clue = cat.clues.find((c) => c.id === clueId);
      if (clue) {
        setRevealed({ categoryId: cat.id, clueId: clue.id });
        break;
      }
    }
  }, [board, searchParams]);

  const themeStyles = useBoardThemeStyles(board);

  if (!board) return <div className="game-screen"><p>Loading…</p></div>;

  const activeClue =
    revealed && revealed.categoryId === '__final__'
      ? {
          category: { name: board.finalJeopardy.category || 'Final Jeopardy' },
          clue: board.finalJeopardy.tile,
        }
      : revealed
        ? findClue(board, revealed.categoryId, revealed.clueId)
        : null;

  const isCharacterGuess = activeClue && isCharacterGuessTile(activeClue.clue);
  const isCropReveal = activeClue && isCropRevealTile(activeClue.clue);

  return (
    <div className="game-screen preview-screen board-themed" style={themeStyles}>
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

      {activeClue && isCharacterGuess && (
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

      {activeClue && isCropReveal && (
        <div className="clue-overlay cg-overlay" role="dialog" aria-modal="true">
          <CropRevealPanel
            board={board}
            categoryName={activeClue.category.name}
            clue={activeClue.clue}
            mode="preview"
            onBackToBoard={() => {
              setRevealed(null);
              setShowAnswer(false);
            }}
          />
        </div>
      )}

      {activeClue && !isCharacterGuess && !isCropReveal && (
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
  const themeStyles = useBoardThemeStyles(board);
  const gridStyle = { '--board-cols': board.categories.length, ...themeStyles } as CSSProperties;

  return (
    <div className="game-board game-board-columns board-themed" style={gridStyle} role="grid" aria-label="Game board">
      {board.categories.map((cat) => {
        const headerStyle = getCategoryHeaderStyle(cat, board);
        return (
        <div key={cat.id} className="game-board-column" role="presentation">
          <div
            className="game-category"
            role="columnheader"
            style={{
              background: headerStyle.headerBackgroundImage
                ? `url(${headerStyle.headerBackgroundImage}) center/cover`
                : headerStyle.headerBackground,
              color: headerStyle.headerTextColor,
            }}
          >
            {cat.name}
          </div>
          {cat.clues.map((clue) => {
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
      );
      })}
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
  attachmentRevealIndex = 0,
  onRevealNextAttachment,
  enlargeImages = false,
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
  attachmentRevealIndex?: number;
  onRevealNextAttachment?: () => void;
  enlargeImages?: boolean;
}) {
  const value = clueValue ?? clue.value;
  const showAttachments = hasAttachments(clue);

  return (
    <div className="clue-overlay" role="dialog" aria-modal="true" aria-labelledby="clue-overlay-title">
      <div className="clue-overlay-panel">
        <p className="clue-overlay-category">{categoryName}</p>
        <p className="clue-overlay-value game-value">{formatPeso(value)}</p>
        {clue.isDailyDouble && <span className="badge badge-dd">Daily Double</span>}
        <h2 id="clue-overlay-title" className="clue-overlay-text">
          {clue.clue || '(No clue text)'}
        </h2>
        {showAttachments && (
          <ClueAttachments
            clue={clue}
            revealIndex={attachmentRevealIndex}
            onRevealNext={onRevealNextAttachment}
            showProgress
            enlargeImages={enlargeImages}
          />
        )}
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
          <TeamScoreQuickActions
            teams={teams}
            value={value}
            selections={teamScoreSelections}
            onScore={onScoreTeam}
          />
        )}
      </div>
    </div>
  );
}
