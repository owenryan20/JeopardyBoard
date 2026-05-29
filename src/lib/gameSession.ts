import type { GameSession, Team } from '../types/board';
import { createId } from './ids';

const DEFAULT_TEAM_NAMES = ['Alpha', 'Bravo', 'Charlie'];

export function createDefaultTeams(count = 3): Team[] {
  return Array.from({ length: count }, (_, i) => ({
    id: createId(),
    name: DEFAULT_TEAM_NAMES[i] ?? `Team ${i + 1}`,
    score: 0,
  }));
}

export function createDefaultSession(boardId: string): GameSession {
  return {
    boardId,
    teams: createDefaultTeams(),
    revealedClueId: null,
    showAnswer: false,
    finalJeopardyRevealed: 'none',
    finalJeopardyWagers: {},
    finalJeopardyOutcomes: {},
  };
}

/** Normalize sessions saved before wager support was added. */
export function normalizeGameSession(raw: GameSession): GameSession {
  return {
    ...raw,
    finalJeopardyRevealed: raw.finalJeopardyRevealed ?? 'none',
    finalJeopardyWagers: raw.finalJeopardyWagers ?? {},
    finalJeopardyOutcomes: raw.finalJeopardyOutcomes ?? {},
  };
}

export function maxFinalWager(team: Team): number {
  return Math.max(0, team.score);
}

export function applyFinalJeopardyResults(
  teams: Team[],
  wagers: Record<string, number>,
  outcomes: Record<string, boolean | null>,
): Team[] {
  return teams.map((team) => {
    const wager = wagers[team.id] ?? 0;
    const outcome = outcomes[team.id];
    if (outcome === null || outcome === undefined) return team;
    const delta = outcome ? wager : -wager;
    return { ...team, score: team.score + delta };
  });
}
