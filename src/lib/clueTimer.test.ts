import { describe, expect, it } from 'vitest';
import { formatTimerDisplay, normalizeTimerSeconds } from './clueTimer';

describe('normalizeTimerSeconds', () => {
  it('returns undefined for missing or invalid values', () => {
    expect(normalizeTimerSeconds(undefined)).toBeUndefined();
    expect(normalizeTimerSeconds(0)).toBeUndefined();
    expect(normalizeTimerSeconds(-5)).toBeUndefined();
    expect(normalizeTimerSeconds('abc')).toBeUndefined();
  });

  it('normalizes positive integers', () => {
    expect(normalizeTimerSeconds(30)).toBe(30);
    expect(normalizeTimerSeconds('45')).toBe(45);
    expect(normalizeTimerSeconds(30.9)).toBe(30);
  });
});

describe('formatTimerDisplay', () => {
  it('formats mm:ss', () => {
    expect(formatTimerDisplay(90_500)).toBe('1:31');
    expect(formatTimerDisplay(500)).toBe('0:01');
    expect(formatTimerDisplay(0)).toBe('0:00');
  });
});
