import { describe, expect, it } from 'vitest';
import {
  dedupeEntries,
  mergeBoardWheels,
  parseWheelEntries,
  planWheelSpin,
  getTeamWheelEntries,
} from './wheelOfNames';

describe('parseWheelEntries', () => {
  it('parses lines and dedupes case-insensitively', () => {
    expect(parseWheelEntries('Alice\nBob\nalice\n\nBob')).toEqual(['Alice', 'Bob']);
  });
});

describe('planWheelSpin', () => {
  it('returns a winner index and rotation', () => {
    const plan = planWheelSpin(4, 0);
    expect(plan).not.toBeNull();
    expect(plan!.winnerIndex).toBeGreaterThanOrEqual(0);
    expect(plan!.winnerIndex).toBeLessThan(4);
    expect(plan!.targetRotation).toBeGreaterThan(360);
  });
});

describe('getTeamWheelEntries', () => {
  it('uses team names', () => {
    expect(
      getTeamWheelEntries([
        { id: '1', name: 'Alpha', score: 0 },
        { id: '2', name: 'Bravo', score: 0 },
      ]),
    ).toEqual(['Alpha', 'Bravo']);
  });
});

describe('mergeBoardWheels', () => {
  it('merges wheels by id without overwriting existing', () => {
    const existing = [{ id: 'a', name: 'A', entries: ['1', '2'] }];
    const incoming = [
      { id: 'a', name: 'Changed', entries: ['x'] },
      { id: 'b', name: 'B', entries: ['3', '4'] },
    ];
    expect(mergeBoardWheels(existing, incoming)).toEqual([
      { id: 'a', name: 'A', entries: ['1', '2'] },
      { id: 'b', name: 'B', entries: ['3', '4'] },
    ]);
  });
});

describe('dedupeEntries', () => {
  it('removes duplicates', () => {
    expect(dedupeEntries(['A', 'a', 'B'])).toEqual(['A', 'B']);
  });
});
