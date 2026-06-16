import { describe, expect, it } from 'vitest';
import { findNewBuzzes, normalizeBuzzes } from './buzzIn';

describe('normalizeBuzzes', () => {
  it('reads buzzes array', () => {
    expect(
      normalizeBuzzes({
        buzzes: [{ username: 'alice', id: '1', time: 100 }],
      }),
    ).toEqual([{ username: 'alice', id: '1', time: 100 }]);
  });

  it('reads buzzArr array', () => {
    expect(
      normalizeBuzzes({
        buzzArr: [{ username: 'bob' }],
      }),
    ).toEqual([{ username: 'bob' }]);
  });

  it('prefers buzzes over buzzArr', () => {
    expect(
      normalizeBuzzes({
        buzzes: [{ username: 'first' }],
        buzzArr: [{ username: 'second' }],
      }),
    ).toEqual([{ username: 'first' }]);
  });

  it('returns empty for invalid payloads', () => {
    expect(normalizeBuzzes(null)).toEqual([]);
    expect(normalizeBuzzes({ buzzes: 'nope' })).toEqual([]);
    expect(normalizeBuzzes({ buzzes: [{ id: 'x' }] })).toEqual([]);
  });
});

describe('findNewBuzzes', () => {
  it('returns only newly added buzzes', () => {
    const prev = [{ username: 'alice', id: '1' }];
    const next = [
      { username: 'alice', id: '1' },
      { username: 'bob', id: '2' },
    ];
    expect(findNewBuzzes(prev, next)).toEqual([{ username: 'bob', id: '2' }]);
  });

  it('returns empty when buzz list is cleared', () => {
    expect(findNewBuzzes([{ username: 'alice', id: '1' }], [])).toEqual([]);
  });
});
