import { describe, expect, it } from 'vitest';
import {
  applyWrongGuess,
  anchorFocalPoint,
  createCropRevealRuntimeState,
  createDefaultCropRevealConfig,
  cropInsetForAnchor,
  cropInsetPercent,
  expandCropPercent,
  isCropRevealAnswerCorrect,
  validateCropRevealConfig,
} from './cropReveal';

describe('cropReveal', () => {
  const config = {
    ...createDefaultCropRevealConfig(200),
    image: { id: 'img', type: 'image' as const, title: 'x', url: 'https://x.test/a.png' },
    correctAnswer: 'Paris',
    acceptedAnswers: ['City of Light'],
  };

  it('validates required fields', () => {
    const bad = validateCropRevealConfig({
      ...config,
      correctAnswer: '',
      image: { id: 'i', type: 'image', title: '', url: '' },
    });
    expect(bad.length).toBeGreaterThan(0);
  });

  it('increments attempts on wrong guess with auto-expand', () => {
    const state = createCropRevealRuntimeState('tile-1', config);
    const next = applyWrongGuess(state, config, 'London');
    expect(next.attempts).toBe(1);
    expect(next.currentRevealPercent).toBeGreaterThan(state.currentRevealPercent);
  });

  it('matches accepted answers case-insensitively', () => {
    expect(isCropRevealAnswerCorrect('city of light', config)).toBe(true);
    expect(isCropRevealAnswerCorrect('paris', config)).toBe(true);
  });

  it('expands crop percent up to 100', () => {
    expect(expandCropPercent(80, 30)).toBe(100);
  });

  it('centers crop inset for center anchor', () => {
    expect(cropInsetPercent(15)).toBe('42.5% 42.5% 42.5% 42.5%');
  });

  it('anchors crop inset to top-left', () => {
    expect(cropInsetForAnchor(15, 'top-left')).toBe('0% 85% 85% 0%');
  });

  it('anchors crop inset to bottom-right', () => {
    expect(cropInsetForAnchor(20, 'bottom-right')).toBe('80% 0% 0% 80%');
  });

  it('uses custom focal point for custom anchor', () => {
    expect(anchorFocalPoint('custom', 25, 75)).toEqual({ x: 25, y: 75 });
    expect(cropInsetForAnchor(10, 'custom', 25, 75)).toBe('70% 70% 20% 20%');
  });

  it('enters maxAttemptsReached instead of failed when max attempts hit', () => {
    const limited = { ...config, maxAttempts: 2 };
    let state = createCropRevealRuntimeState('tile-1', limited);
    state = applyWrongGuess(state, limited, 'London');
    expect(state.status).toBe('playing');
    state = applyWrongGuess(state, limited, 'Berlin');
    expect(state.status).toBe('maxAttemptsReached');
    expect(state.attempts).toBe(2);
  });

  it('allows more guesses after max attempts waived', () => {
    const limited = { ...config, maxAttempts: 1 };
    let state = createCropRevealRuntimeState('tile-1', limited);
    state = applyWrongGuess(state, limited, 'London');
    expect(state.status).toBe('maxAttemptsReached');
    state = { ...state, status: 'playing' as const, maxAttemptsWaived: true };
    state = applyWrongGuess(state, limited, 'Berlin');
    expect(state.status).toBe('playing');
    expect(state.attempts).toBe(2);
  });
});
