import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FinalJeopardyOverlay } from '../components/game/FinalJeopardyOverlay';
import { FinalJeopardyRainbowWrap } from '../components/game/FinalJeopardyRainbowWrap';
import { CharacterGuessPanel } from '../components/minigame/CharacterGuessPanel';
import { CropRevealPanel } from '../components/minigame/CropRevealPanel';
import type { Board, CropRevealRuntimeState, GameSession, MiniGameProgress, Team } from '../types/board';
import { isCharacterGuessTile, isCropRevealTile } from '../types/board';
import { createCropRevealRuntimeState } from '../lib/cropReveal';
import { confirmDialog, promptDialog } from '../lib/dialog';
import { migrateTeam, DEFAULT_TEAM_COLORS } from '../lib/boardTheme';
import { useBoardThemeStyles } from '../hooks/useBoardTheme';
import { formatPeso } from '../lib/currency';
import { createId } from '../lib/ids';
import { findClue } from '../lib/boardFactory';
import { createDefaultSession, createDefaultTeams } from '../lib/gameSession';
import {
  addRecentBoard,
  clearGameSession,
  getBoard,
  loadGameSession,
  saveGameSession,
  upsertBoard,
} from '../lib/storage';
import { ClueOverlay, GameBoardGrid } from './PreviewPage';
import './GameBoard.css';

const TEAM_COUNT_OPTIONS = Array.from({ length: 9 }, (_, i) => i + 2);

type TeamClueScore = 'add' | 'subtract';

const defaultMiniGameProgress = (): MiniGameProgress => ({
  guesses: [],
  revealed: false,
  won: null,
  finished: false,
});

export function GamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(() => (id ? getBoard(id) ?? null : null));
  const [session, setSession] = useState<GameSession | null>(null);
  const [revealed, setRevealed] = useState<{ categoryId: string; clueId: string } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [teamCount, setTeamCount] = useState(3);
  const [clueScoring, setClueScoring] = useState<Record<string, Record<string, TeamClueScore>>>({});

  useEffect(() => {
    if (!id) return;
    const loaded = getBoard(id);
    if (!loaded) {
      navigate('/boards');
      return;
    }
    setBoard(loaded);
    addRecentBoard(id);
    const existing = loadGameSession(id);
    setSession(existing ?? createDefaultSession(id));
    if (existing) setTeamCount(existing.teams.length);
  }, [id, navigate]);

  useEffect(() => {
    if (session) saveGameSession(session);
  }, [session]);

  const themeStyles = useBoardThemeStyles(board);

  if (!board || !session) {
    return (
      <div className="game-screen">
        <p>Loading game…</p>
      </div>
    );
  }

  const usedIds = new Set(
    board.categories.flatMap((c) => c.clues.filter((cl) => cl.isUsed).map((cl) => cl.id)),
  );

  const activeClue =
    revealed && findClue(board, revealed.categoryId, revealed.clueId);

  const isCharacterGuess = activeClue && isCharacterGuessTile(activeClue.clue);
  const isCropReveal = activeClue && isCropRevealTile(activeClue.clue);

  const attachmentRevealIndex =
    revealed && session.attachmentRevealIndex[revealed.clueId] !== undefined
      ? session.attachmentRevealIndex[revealed.clueId]
      : 0;

  const revealNextAttachment = () => {
    if (!revealed) return;
    setSession((s) => {
      if (!s) return s;
      const current = s.attachmentRevealIndex[revealed.clueId] ?? 0;
      return {
        ...s,
        attachmentRevealIndex: {
          ...s.attachmentRevealIndex,
          [revealed.clueId]: current + 1,
        },
      };
    });
  };

  const markClueUsed = () => {
    if (!revealed) return;
    const updated: Board = {
      ...board,
      categories: board.categories.map((cat) =>
        cat.id === revealed.categoryId
          ? {
              ...cat,
              clues: cat.clues.map((c) =>
                c.id === revealed.clueId ? { ...c, isUsed: true } : c,
              ),
            }
          : cat,
      ),
    };
    setBoard(updated);
    upsertBoard(updated);
    setRevealed(null);
    setShowAnswer(false);
  };

  const closeOverlay = () => {
    setRevealed(null);
    setShowAnswer(false);
  };

  const updateCropRevealProgress = (clueId: string, progress: CropRevealRuntimeState) => {
    setSession((s) =>
      s
        ? {
            ...s,
            cropRevealProgress: { ...s.cropRevealProgress, [clueId]: progress },
          }
        : s,
    );
  };

  const updateMiniGameProgress = (clueId: string, progress: MiniGameProgress) => {
    setSession((s) =>
      s
        ? {
            ...s,
            miniGameProgress: { ...s.miniGameProgress, [clueId]: progress },
          }
        : s,
    );
  };

  const updateTeamScore = (teamId: string, delta: number) => {
    setSession((s) =>
      s
        ? {
            ...s,
            teams: s.teams.map((t) =>
              t.id === teamId ? { ...t, score: t.score + delta } : t,
            ),
          }
        : s,
    );
  };

  const toggleClueScore = (clueId: string, teamId: string, delta: number) => {
    const direction: TeamClueScore = delta > 0 ? 'add' : 'subtract';
    const existing = clueScoring[clueId]?.[teamId];

    if (existing === direction) {
      updateTeamScore(teamId, -delta);
      setClueScoring((prev) => {
        const clueMap = { ...(prev[clueId] ?? {}) };
        delete clueMap[teamId];
        if (Object.keys(clueMap).length === 0) {
          const { [clueId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [clueId]: clueMap };
      });
      return;
    }

    if (existing) return;

    setClueScoring((prev) => ({
      ...prev,
      [clueId]: { ...(prev[clueId] ?? {}), [teamId]: direction },
    }));
    updateTeamScore(teamId, delta);
  };

  const setTeamScore = (teamId: string, score: number) => {
    setSession((s) =>
      s
        ? {
            ...s,
            teams: s.teams.map((t) => (t.id === teamId ? { ...t, score } : t)),
          }
        : s,
    );
  };

  const resetGame = async () => {
    const ok = await confirmDialog({
      title: 'Reset game?',
      description: 'Reset all used tiles and scores?',
      confirmLabel: 'Reset',
      variant: 'destructive',
      closeOnBackdrop: false,
    });
    if (!ok) return;
    const resetBoard: Board = {
      ...board,
      categories: board.categories.map((cat) => ({
        ...cat,
        clues: cat.clues.map((c) => ({ ...c, isUsed: false })),
      })),
    };
    setBoard(resetBoard);
    upsertBoard(resetBoard);
    const fresh = createDefaultSession(board.id);
    fresh.teams = createDefaultTeams(session.teams.length).map((t, i) => ({
      ...t,
      name: session.teams[i]?.name ?? t.name,
    }));
    setSession(fresh);
    setRevealed(null);
    setShowAnswer(false);
    setShowFinal(false);
    setClueScoring({});
    clearGameSession(board.id);
    saveGameSession(fresh);
  };

  const resizeTeams = (count: number) => {
    setTeamCount(count);
    setSession((s) => {
      if (!s) return s;
      const teams = [...s.teams];
      while (teams.length < count) {
        teams.push(
          migrateTeam(
            {
              id: createId(),
              name: `Team ${teams.length + 1}`,
              score: 0,
            },
            teams.length,
          ),
        );
      }
      return { ...s, teams: teams.slice(0, count) };
    });
  };

  return (
    <div className="game-screen board-themed" style={themeStyles}>
      <header className="game-top-bar">
        <h1>{board.title}</h1>
        <div className="game-top-actions">
          <Link to={`/boards/${board.id}/edit`} className="btn">
            Back to Editor
          </Link>
          <FinalJeopardyRainbowWrap>
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (id) {
                  setBoard(getBoard(id) ?? board);
                }
                setShowFinal(true);
              }}
            >
              Final Jeopardy
            </button>
          </FinalJeopardyRainbowWrap>
          <button type="button" className="btn btn-danger" onClick={() => void resetGame()}>
            Reset Game
          </button>
        </div>
      </header>

      <div className="game-board-wrap">
        <GameBoardGrid
          board={board}
          usedClueIds={usedIds}
          onTileClick={(categoryId, clue) => {
            setRevealed({ categoryId, clueId: clue.id });
            setShowAnswer(false);
          }}
        />
      </div>

      <TeamScoreDock
        teams={session.teams}
        teamCount={teamCount}
        onScoreDelta={updateTeamScore}
        onSetScore={setTeamScore}
        onTeamNameChange={(teamId, name) =>
          setSession((s) =>
            s
              ? {
                  ...s,
                  teams: s.teams.map((t) => (t.id === teamId ? { ...t, name } : t)),
                }
              : s,
          )
        }
        onTeamCountChange={resizeTeams}
        onTeamThemeChange={(teamId, partial) =>
          setSession((s) =>
            s
              ? {
                  ...s,
                  teams: s.teams.map((t) =>
                    t.id === teamId
                      ? {
                          ...t,
                          theme: {
                            color: partial.color ?? t.theme?.color ?? DEFAULT_TEAM_COLORS[0],
                            textColor: partial.textColor ?? t.theme?.textColor ?? '#ffffff',
                            background: t.theme?.background,
                          },
                        }
                      : t,
                  ),
                }
              : s,
          )
        }
      />

      {activeClue && isCharacterGuess && (
        <div className="clue-overlay cg-overlay" role="dialog" aria-modal="true">
          <CharacterGuessPanel
            board={board}
            categoryName={activeClue.category.name}
            clue={activeClue.clue}
            mode="game"
            progress={session.miniGameProgress[activeClue.clue.id] ?? defaultMiniGameProgress()}
            onProgressChange={(p) => updateMiniGameProgress(activeClue.clue.id, p)}
            teams={session.teams}
            teamScoreSelections={clueScoring[activeClue.clue.id] ?? {}}
            onTeamScore={(teamId, delta) => toggleClueScore(activeClue.clue.id, teamId, delta)}
            onBackToBoard={closeOverlay}
            onMarkUsed={markClueUsed}
          />
        </div>
      )}

      {activeClue && isCropReveal && activeClue.clue.miniGame?.gameType === 'cropReveal' && (
        <div className="clue-overlay cg-overlay" role="dialog" aria-modal="true">
          <CropRevealPanel
            board={board}
            categoryName={activeClue.category.name}
            clue={activeClue.clue}
            mode="game"
            progress={
              session.cropRevealProgress[activeClue.clue.id]
              ?? createCropRevealRuntimeState(activeClue.clue.id, activeClue.clue.miniGame)
            }
            onProgressChange={(p) => updateCropRevealProgress(activeClue.clue.id, p)}
            teams={session.teams}
            teamScoreSelections={clueScoring[activeClue.clue.id] ?? {}}
            onTeamScore={(teamId, delta) => toggleClueScore(activeClue.clue.id, teamId, delta)}
            onBackToBoard={closeOverlay}
            onMarkUsed={markClueUsed}
          />
        </div>
      )}

      {activeClue && !isCharacterGuess && !isCropReveal && (
        <ClueOverlay
          categoryName={activeClue.category.name}
          clue={activeClue.clue}
          showAnswer={showAnswer}
          enlargeImages
          teamScoreSelections={
            revealed ? (clueScoring[revealed.clueId] ?? {}) : {}
          }
          attachmentRevealIndex={attachmentRevealIndex}
          onRevealNextAttachment={revealNextAttachment}
          onClose={closeOverlay}
          onShowAnswer={() => setShowAnswer(true)}
          onMarkUsed={markClueUsed}
          teams={session.teams}
          onScoreTeam={(teamId, delta) => {
            if (revealed) toggleClueScore(revealed.clueId, teamId, delta);
          }}
        />
      )}

      {showFinal && (
        <FinalJeopardyOverlay
          board={board}
          session={session}
          onClose={() => setShowFinal(false)}
          onUpdateSession={setSession}
        />
      )}
    </div>
  );
}

function TeamScoreDock({
  teams,
  teamCount,
  onScoreDelta,
  onSetScore,
  onTeamNameChange,
  onTeamCountChange,
  onTeamThemeChange,
}: {
  teams: Team[];
  teamCount: number;
  onScoreDelta: (teamId: string, delta: number) => void;
  onSetScore: (teamId: string, score: number) => void;
  onTeamNameChange: (teamId: string, name: string) => void;
  onTeamCountChange: (count: number) => void;
  onTeamThemeChange: (teamId: string, partial: { color?: string; textColor?: string }) => void;
}) {
  return (
    <footer className="team-dock" aria-label="Team scores">
      <div className="team-dock-controls">
        <span className="team-dock-label" id="team-count-label">
          Teams:
        </span>
        <div
          className="team-count-picker"
          role="group"
          aria-labelledby="team-count-label"
        >
          {TEAM_COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              className={`team-count-btn${teamCount === n ? ' team-count-btn-active' : ''}`}
              aria-pressed={teamCount === n}
              aria-label={`${n} teams`}
              onClick={() => onTeamCountChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="team-dock-cards">
        {teams.map((team, i) => {
          const migrated = migrateTeam(team, i);
          const accent = migrated.theme?.color ?? DEFAULT_TEAM_COLORS[i % DEFAULT_TEAM_COLORS.length];
          const textColor = migrated.theme?.textColor ?? '#ffffff';
          return (
          <div
            key={team.id}
            className="team-dock-card"
            style={{
              borderColor: accent,
              background: migrated.theme?.background?.type === 'solid'
                ? migrated.theme.background.color
                : undefined,
              color: textColor,
            }}
          >
            <input
              className="team-name-input"
              value={team.name}
              aria-label={`Team ${i + 1} name`}
              onChange={(e) => onTeamNameChange(team.id, e.target.value)}
            />
            <span className="team-score game-value">{formatPeso(team.score)}</span>
            <div className="team-style-row">
              <label className="sr-only" htmlFor={`team-color-${team.id}`}>Team color</label>
              <input
                id={`team-color-${team.id}`}
                type="color"
                className="team-color-input"
                value={accent}
                title="Team color"
                onChange={(e) => onTeamThemeChange(team.id, { color: e.target.value })}
              />
            </div>
            <div className="team-score-buttons">
              <button
                type="button"
                className="btn btn-sm"
                aria-label={`Subtract 100 from ${team.name}`}
                onClick={() => onScoreDelta(team.id, -100)}
              >
                −100
              </button>
              <button
                type="button"
                className="btn btn-sm"
                aria-label={`Add 100 to ${team.name}`}
                onClick={() => onScoreDelta(team.id, 100)}
              >
                +100
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                aria-label={`Set ${team.name} score manually`}
                onClick={async () => {
                  const val = await promptDialog({
                    title: `Set score for ${team.name}`,
                    defaultValue: String(team.score),
                    inputLabel: 'Score',
                    requireInput: true,
                  });
                  if (val !== null && !Number.isNaN(Number(val))) {
                    onSetScore(team.id, Number(val));
                  }
                }}
              >
                Set
              </button>
            </div>
          </div>
        );
        })}
      </div>
    </footer>
  );
}
