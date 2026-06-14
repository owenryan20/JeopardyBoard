import { formatPeso } from '../../lib/currency';
import { ClueAttachments } from '../clue/ClueAttachments';
import { ClueAnswerMedia } from '../clue/ClueAnswerMedia';
import { CharacterGuessPanel } from '../minigame/CharacterGuessPanel';
import { CropRevealPanel } from '../minigame/CropRevealPanel';
import type { Board, GameSession, Team } from '../../types/board';
import { isCharacterGuessTile, isCropRevealTile } from '../../types/board';
import {
  applyFinalJeopardyResults,
  maxFinalWager,
} from '../../lib/gameSession';
import { getCorrectAnswerName } from '../../lib/miniGame';
import { hasAttachments } from '../../lib/attachments';
import './FinalJeopardyOverlay.css';

interface FinalJeopardyOverlayProps {
  board: Board;
  session: GameSession;
  onClose: () => void;
  onUpdateSession: (session: GameSession) => void;
}

export function FinalJeopardyOverlay({
  board,
  session,
  onClose,
  onUpdateSession,
}: FinalJeopardyOverlayProps) {
  const fj = board.finalJeopardy;
  const tile = fj.tile;
  const isCharacterGuess = isCharacterGuessTile(tile);
  const isCropReveal = isCropRevealTile(tile);
  const phase = session.finalJeopardyRevealed;
  const wagers = session.finalJeopardyWagers;
  const outcomes = session.finalJeopardyOutcomes;
  const miniGameProgress = session.miniGameProgress[tile.id];

  const setPhase = (finalJeopardyRevealed: GameSession['finalJeopardyRevealed']) => {
    onUpdateSession({ ...session, finalJeopardyRevealed });
  };

  const setWager = (teamId: string, amount: number) => {
    onUpdateSession({
      ...session,
      finalJeopardyWagers: { ...wagers, [teamId]: amount },
    });
  };

  const setOutcome = (teamId: string, correct: boolean) => {
    onUpdateSession({
      ...session,
      finalJeopardyOutcomes: { ...outcomes, [teamId]: correct },
    });
  };

  const allWagersEntered = session.teams.every(
    (t) => typeof wagers[t.id] === 'number' && wagers[t.id] >= 0,
  );
  const allOutcomesSet = session.teams.every(
    (t) => outcomes[t.id] === true || outcomes[t.id] === false,
  );

  const applyResults = () => {
    const updatedTeams = applyFinalJeopardyResults(
      session.teams,
      wagers,
      outcomes,
    );
    onUpdateSession({
      ...session,
      teams: updatedTeams,
      finalJeopardyRevealed: 'results',
    });
  };

  const updateMiniGameProgress = (progress: import('../../types/board').MiniGameProgress) => {
    onUpdateSession({
      ...session,
      miniGameProgress: { ...session.miniGameProgress, [tile.id]: progress },
    });
  };

  const answerLabel = isCharacterGuess
    ? getCorrectAnswerName(board, tile)
    : isCropReveal && tile.miniGame?.gameType === 'cropReveal'
      ? tile.miniGame.correctAnswer
      : tile.answer;

  return (
    <div
      className="clue-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="final-jeopardy-title"
    >
      <div className="clue-overlay-panel final-panel">
        <h2 id="final-jeopardy-title">Final Jeopardy</h2>

        {phase === 'none' && (
          <>
            <p>Ready to reveal the Final Jeopardy category?</p>
            <button type="button" className="btn btn-primary" onClick={() => setPhase('category')}>
              Reveal Category
            </button>
          </>
        )}

        {phase === 'category' && (
          <>
            <p className="clue-overlay-category">{fj.category || '(No category set)'}</p>
            <p className="final-hint">
              Teams may now enter their wagers (up to their current score).
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const initialWagers = Object.fromEntries(
                  session.teams.map((t) => [t.id, wagers[t.id] ?? 0]),
                );
                onUpdateSession({
                  ...session,
                  finalJeopardyRevealed: 'wagers',
                  finalJeopardyWagers: initialWagers,
                });
              }}
            >
              Collect Wagers
            </button>
          </>
        )}

        {phase === 'wagers' && (
          <>
            <p className="clue-overlay-category">{fj.category}</p>
            <WagerForm teams={session.teams} wagers={wagers} onWagerChange={setWager} />
            <button
              type="button"
              className="btn btn-primary"
              disabled={!allWagersEntered}
              onClick={() => setPhase('clue')}
            >
              Lock Wagers &amp; Reveal Clue
            </button>
          </>
        )}

        {phase === 'clue' && (
          <>
            <p className="clue-overlay-category">{fj.category}</p>
            {isCharacterGuess ? (
              <div className="final-minigame-wrap">
                <CharacterGuessPanel
                  board={board}
                  categoryName={fj.category}
                  clue={tile}
                  mode="game"
                  progress={miniGameProgress}
                  onProgressChange={updateMiniGameProgress}
                />
              </div>
            ) : isCropReveal ? (
              <div className="final-minigame-wrap">
                <CropRevealPanel
                  board={board}
                  categoryName={fj.category}
                  clue={tile}
                  mode="game"
                  progress={
                    session.cropRevealProgress[tile.id]
                    ?? undefined
                  }
                  onProgressChange={(p) =>
                    onUpdateSession({
                      ...session,
                      cropRevealProgress: { ...session.cropRevealProgress, [tile.id]: p },
                    })
                  }
                />
              </div>
            ) : (
              <>
                <p className="clue-overlay-text">{tile.clue || '(No clue set)'}</p>
                {hasAttachments(tile) && (
                  <ClueAttachments clue={tile} showProgress enlargeImages />
                )}
              </>
            )}
            <div className="final-wager-summary" aria-label="Locked wagers">
              {session.teams.map((team) => (
                <span key={team.id}>
                  {team.name}: <strong className="game-value">{formatPeso(wagers[team.id] ?? 0)}</strong>
                </span>
              ))}
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setPhase('answer')}>
              Show Answer
            </button>
          </>
        )}

        {phase === 'answer' && (
          <>
            <p className="clue-overlay-category">{fj.category}</p>
            {!isCharacterGuess && !isCropReveal && (
              <>
                <p className="clue-overlay-text">{tile.clue}</p>
                {hasAttachments(tile) && (
                  <ClueAttachments clue={tile} showProgress enlargeImages />
                )}
              </>
            )}
            <p className="clue-overlay-answer">
              <strong>Answer:</strong> {answerLabel || '(No answer set)'}
            </p>
            {!isCharacterGuess && !isCropReveal && (
              <ClueAnswerMedia clue={tile} enlargeImages />
            )}
            <p className="final-hint">Mark each team correct or incorrect to apply wagers.</p>
            <OutcomeForm
              teams={session.teams}
              wagers={wagers}
              outcomes={outcomes}
              onOutcome={setOutcome}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={!allOutcomesSet}
              onClick={applyResults}
            >
              Apply Wagers to Scores
            </button>
          </>
        )}

        {phase === 'results' && (
          <>
            <p className="final-hint">Final standings</p>
            <ul className="final-standings">
              {[...session.teams]
                .sort((a, b) => b.score - a.score)
                .map((team, i) => (
                  <li key={team.id}>
                    <span className="final-rank">{i + 1}.</span>
                    <span>{team.name}</span>
                    <span className="game-value">{formatPeso(team.score)}</span>
                  </li>
                ))}
            </ul>
          </>
        )}

        <button type="button" className="btn final-close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function WagerForm({
  teams,
  wagers,
  onWagerChange,
}: {
  teams: Team[];
  wagers: Record<string, number>;
  onWagerChange: (teamId: string, amount: number) => void;
}) {
  return (
    <div className="final-wager-form">
      {teams.map((team) => {
        const max = maxFinalWager(team);
        const value = wagers[team.id] ?? '';
        return (
          <div key={team.id} className="final-wager-row">
            <div className="final-wager-team">
              <span className="final-wager-name">{team.name}</span>
              <span className="final-wager-score">
                Score: <span className="game-value">{formatPeso(team.score)}</span>
              </span>
              <span className="final-wager-max">Max wager: {formatPeso(max)}</span>
            </div>
            <label className="sr-only" htmlFor={`wager-${team.id}`}>
              Wager for {team.name}
            </label>
            <input
              id={`wager-${team.id}`}
              type="number"
              className="input score-input final-wager-input"
              min={0}
              max={max}
              step={1}
              placeholder="0"
              value={value}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isNaN(n)) return;
                onWagerChange(team.id, Math.min(max, Math.max(0, Math.floor(n))));
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function OutcomeForm({
  teams,
  wagers,
  outcomes,
  onOutcome,
}: {
  teams: Team[];
  wagers: Record<string, number>;
  outcomes: Record<string, boolean | null>;
  onOutcome: (teamId: string, correct: boolean) => void;
}) {
  return (
    <div className="final-outcome-form">
      {teams.map((team) => {
        const wager = wagers[team.id] ?? 0;
        const outcome = outcomes[team.id];
        return (
          <div key={team.id} className="final-outcome-row">
            <span>
              {team.name} <span className="final-wager-badge">({formatPeso(wager)})</span>
            </span>
            <div className="final-outcome-buttons" role="group" aria-label={`Result for ${team.name}`}>
              <button
                type="button"
                className={`btn btn-sm${outcome === true ? ' final-outcome-selected' : ''}`}
                aria-pressed={outcome === true}
                onClick={() => onOutcome(team.id, true)}
              >
                Correct (+{formatPeso(wager)})
              </button>
              <button
                type="button"
                className={`btn btn-sm${outcome === false ? ' final-outcome-selected' : ''}`}
                aria-pressed={outcome === false}
                onClick={() => onOutcome(team.id, false)}
              >
                Incorrect (−{formatPeso(wager)})
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
