import type { Clue } from '../types/board';

const MAX_TIMER_SECONDS = 99 * 60 + 59;

export function normalizeTimerSeconds(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.min(Math.floor(parsed), MAX_TIMER_SECONDS);
}

export function getClueTimerSeconds(clue: Clue): number | undefined {
  return normalizeTimerSeconds(clue.timerSeconds);
}

export function formatTimerDisplay(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
