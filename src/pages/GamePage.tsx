import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FinalJeopardyOverlay } from '../components/game/FinalJeopardyOverlay';
import { CharacterGuessPanel } from '../components/minigame/CharacterGuessPanel';
import type { Board, GameSession, MiniGameProgress, Team } from '../types/board';
import { isMiniGameTile } from '../types/board';
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

const TEAM_COLORS = [
  '#3b82f6', '#a855f7', '#14b8a6', '#f97316', '#ec4899', '#22c55e',
  '#eab308', '#06b6d4', '#ef4444', '#8b5cf6',
];
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

  const isMiniGame = activeClue && isMiniGameTile(activeClue.clue);

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

  const resetGame = () => {
    if (!window.confirm('Reset all used tiles and scores?')) return;
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
        teams.push({
          id: createId(),
          name: `Team ${teams.length + 1}`,
          score: 0,
        });
      }
      return { ...s, teams: teams.slice(0, count) };
    });
  };

  return (
    <div className="game-screen">
      <header className="game-top-bar">
        <h1>{board.title}</h1>
        <div className="game-top-actions">
          <Link to={`/boards/${board.id}/edit`} className="btn">
            Back to Editor
          </Link>
          <button type="button" className="btn" onClick={() => setShowFinal(true)}>
            Final Jeopardy
          </button>
          <button type="button" className="btn btn-danger" onClick={resetGame}>
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
        colors={TEAM_COLORS}
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
      />

      {activeClue && isMiniGame && (
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

      {activeClue && !isMiniGame && (
        <ClueOverlay
          categoryName={activeClue.category.name}
          clue={activeClue.clue}
          showAnswer={showAnswer}
          teamScoreSelections={
            revealed ? (clueScoring[revealed.clueId] ?? {}) : {}
          }
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
  colors,
  onScoreDelta,
  onSetScore,
  onTeamNameChange,
  onTeamCountChange,
}: {
  teams: Team[];
  teamCount: number;
  colors: string[];
  onScoreDelta: (teamId: string, delta: number) => void;
  onSetScore: (teamId: string, score: number) => void;
  onTeamNameChange: (teamId: string, name: string) => void;
  onTeamCountChange: (count: number) => void;
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
        {teams.map((team, i) => (
          <div
            key={team.id}
            className="team-dock-card"
            style={{ borderColor: colors[i % colors.length] }}
          >
            <input
              className="team-name-input"
              value={team.name}
              aria-label={`Team ${i + 1} name`}
              onChange={(e) => onTeamNameChange(team.id, e.target.value)}
            />
            <span className="team-score game-value">{formatPeso(team.score)}</span>
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
                onClick={() => {
                  const val = window.prompt(`Set score for ${team.name}:`, String(team.score));
                  if (val !== null && !Number.isNaN(Number(val))) {
                    onSetScore(team.id, Number(val));
                  }
                }}
              >
                Set
              </button>
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
