import type { GameSession, Team } from '../types/board';
import { migrateTeam } from './boardTheme';
import { createId } from './ids';

const DEFAULT_TEAM_NAMES = ['Alpha', 'Bravo', 'Charlie'];

export function createDefaultTeams(count = 3, names?: string[]): Team[] {
  const source = names && names.length > 0 ? names : DEFAULT_TEAM_NAMES;
  return Array.from({ length: count }, (_, i) =>
    migrateTeam(
      {
        id: createId(),
        name: source[i] ?? `Team ${i + 1}`,
        score: 0,
      },
      i,
    ),
  );
}

export function createDefaultSession(boardId: string, teamNames?: string[]): GameSession {
  const names = teamNames && teamNames.length > 0 ? teamNames : undefined;
  const teamCount = Math.max(2, names?.length ?? 3);
  return {
    boardId,
    teams: createDefaultTeams(teamCount, names),
    revealedClueId: null,
    showAnswer: false,
    finalJeopardyRevealed: 'none',
    finalJeopardyWagers: {},
    finalJeopardyOutcomes: {},
    miniGameProgress: {},
    cropRevealProgress: {},
    attachmentRevealIndex: {},
    runtimeWheels: [],
  };
}

/** Normalize sessions saved before wager / mini game support was added. */
export function normalizeGameSession(raw: GameSession): GameSession {
  return {
    ...raw,
    finalJeopardyRevealed: raw.finalJeopardyRevealed ?? 'none',
    finalJeopardyWagers: raw.finalJeopardyWagers ?? {},
    finalJeopardyOutcomes: raw.finalJeopardyOutcomes ?? {},
    miniGameProgress: raw.miniGameProgress ?? {},
    cropRevealProgress: raw.cropRevealProgress ?? {},
    attachmentRevealIndex: raw.attachmentRevealIndex ?? {},
    runtimeWheels: raw.runtimeWheels ?? [],
    teams: raw.teams.map((t, i) => migrateTeam(t, i)),
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
