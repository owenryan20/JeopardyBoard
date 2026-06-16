import type { Board, Team } from '../types/board';
import type { WheelOfNames } from '../types/wheel';
import { WHEEL_TEAMS_ID } from '../types/wheel';
import { createId } from './ids';

export function parseWheelEntries(text: string): string[] {
  const seen = new Set<string>();
  const entries: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(trimmed);
  }
  return entries;
}

export function formatWheelEntries(entries: string[]): string {
  return entries.join('\n');
}

export function createWheel(name: string, entries: string[]): WheelOfNames {
  return {
    id: createId(),
    name: name.trim() || 'Untitled wheel',
    entries: dedupeEntries(entries),
  };
}

export function dedupeEntries(entries: string[]): string[] {
  const seen = new Set<string>();
  return entries
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (!entry) return false;
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function mergeBoardWheels(
  existing: WheelOfNames[],
  incoming: WheelOfNames[],
): WheelOfNames[] {
  const byId = new Map<string, WheelOfNames>();
  for (const wheel of existing) {
    byId.set(wheel.id, wheel);
  }
  for (const wheel of incoming) {
    if (!byId.has(wheel.id)) {
      byId.set(wheel.id, wheel);
    }
  }
  return Array.from(byId.values());
}

export function getTeamWheelEntries(teams: Team[]): string[] {
  return dedupeEntries(teams.map((team) => team.name.trim()).filter(Boolean));
}

export interface WheelOption {
  id: string;
  name: string;
  entries: string[];
  source: 'teams' | 'board';
}

export function listWheelOptions(
  board: Board,
  teams: Team[],
): WheelOption[] {
  const options: WheelOption[] = [];

  const teamEntries = getTeamWheelEntries(teams);
  if (teamEntries.length > 0) {
    options.push({
      id: WHEEL_TEAMS_ID,
      name: 'Teams (live)',
      entries: teamEntries,
      source: 'teams',
    });
  }

  for (const wheel of board.wheels ?? []) {
    if (wheel.entries.length === 0) continue;
    options.push({
      id: wheel.id,
      name: wheel.name,
      entries: wheel.entries,
      source: 'board',
    });
  }

  return options;
}

export interface SpinPlan {
  winnerIndex: number;
  targetRotation: number;
}

export function planWheelSpin(entryCount: number, currentRotation = 0): SpinPlan | null {
  if (entryCount < 1) return null;

  const winnerIndex = Math.floor(Math.random() * entryCount);
  const segmentAngle = 360 / entryCount;
  const extraSpins = 4 + Math.floor(Math.random() * 4);
  const segmentCenter = (winnerIndex + 0.5) * segmentAngle;
  const targetRotation =
    currentRotation +
    extraSpins * 360 +
    (360 - segmentCenter) -
    (currentRotation % 360);

  return { winnerIndex, targetRotation };
}

export function segmentColors(count: number): string[] {
  const palette = [
    '#1d4ed8',
    '#7c3aed',
    '#db2777',
    '#ea580c',
    '#16a34a',
    '#0891b2',
    '#ca8a04',
    '#dc2626',
    '#4f46e5',
    '#0d9488',
  ];
  return Array.from({ length: count }, (_, index) => palette[index % palette.length]);
}
