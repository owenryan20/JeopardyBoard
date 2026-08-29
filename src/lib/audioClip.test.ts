import { describe, expect, it } from 'vitest';
import {
  formatAudioClock,
  normalizeAudioClipBound,
  normalizeAudioVolume,
  parseAudioClock,
  resolveAudioVolume,
  resolveClipBounds,
  shiftClipWindow,
} from './audioClip';

describe('normalizeAudioVolume', () => {
  it('clamps and omits full volume', () => {
    expect(normalizeAudioVolume(0.5)).toBe(0.5);
    expect(normalizeAudioVolume(1)).toBeUndefined();
    expect(normalizeAudioVolume(2)).toBeUndefined();
    expect(resolveAudioVolume(undefined)).toBe(1);
    expect(resolveAudioVolume(0.25)).toBe(0.25);
  });
});

describe('normalizeAudioClipBound', () => {
  it('drops full-file and invalid ranges', () => {
    expect(normalizeAudioClipBound(0, 10, 10)).toEqual({});
    expect(normalizeAudioClipBound(2, 1, 10)).toEqual({ audioStartSec: 2 });
    expect(normalizeAudioClipBound(1.5, 4.2, 10)).toEqual({
      audioStartSec: 1.5,
      audioEndSec: 4.2,
    });
  });
});

describe('resolveClipBounds', () => {
  it('uses defaults when unset', () => {
    expect(resolveClipBounds(undefined, undefined, 12)).toEqual({ start: 0, end: 12 });
    expect(resolveClipBounds(2, 5, 12)).toEqual({ start: 2, end: 5 });
  });
});

describe('shiftClipWindow', () => {
  it('keeps length and clamps to duration', () => {
    expect(shiftClipWindow(2, 5, 1, 12)).toEqual({ start: 3, end: 6 });
    expect(shiftClipWindow(1, 4, -5, 12)).toEqual({ start: 0, end: 3 });
    expect(shiftClipWindow(8, 11, 5, 12)).toEqual({ start: 9, end: 12 });
  });
});

describe('audio clock format', () => {
  it('formats and parses', () => {
    expect(formatAudioClock(152.45)).toBe('02:32.450');
    expect(parseAudioClock('02:32.450')).toBeCloseTo(152.45, 3);
    expect(parseAudioClock('bad')).toBeNull();
  });
});
