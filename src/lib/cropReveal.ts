import type {
  CropAnchor,
  CropRevealMiniGameConfig,
  CropRevealRuntimeState,
} from '../types/board';
import { createId } from './ids';

export function createDefaultCropRevealConfig(value: number): CropRevealMiniGameConfig {
  return {
    gameType: 'cropReveal',
    title: 'Crop Reveal',
    pointValue: value,
    hostNotes: '',
    image: {
      id: createId(),
      type: 'image',
      title: 'Reveal image',
      url: '',
    },
    correctAnswer: '',
    acceptedAnswers: [],
    startingCropPercent: 15,
    expandPercentPerReveal: 20,
    anchor: 'center',
    autoExpandOnWrongGuess: true,
    showFullImageOnComplete: true,
  };
}

export function createCropRevealRuntimeState(
  tileId: string,
  config: CropRevealMiniGameConfig,
): CropRevealRuntimeState {
  return {
    tileId,
    guesses: [],
    attempts: 0,
    currentRevealPercent: config.startingCropPercent,
    status: 'playing',
  };
}

export function validateCropRevealConfig(config: CropRevealMiniGameConfig): string[] {
  const errors: string[] = [];
  const hasImage =
    (config.image.storage === 'local' && config.image.mediaId) ||
    Boolean(config.image.url?.trim());
  if (!hasImage) errors.push('Image is required.');
  if (!config.correctAnswer.trim()) errors.push('Correct answer is required.');
  if (config.startingCropPercent < 5 || config.startingCropPercent > 100) {
    errors.push('Starting crop must be between 5% and 100%.');
  }
  if (config.expandPercentPerReveal < 5 || config.expandPercentPerReveal > 50) {
    errors.push('Expand amount must be between 5% and 50%.');
  }
  if (config.maxAttempts !== undefined && config.maxAttempts < 1) {
    errors.push('Max attempts must be at least 1 when enabled.');
  }
  if (config.anchor === 'custom') {
    const x = config.customAnchorX ?? 50;
    const y = config.customAnchorY ?? 50;
    if (x < 0 || x > 100 || y < 0 || y > 100) {
      errors.push('Custom anchor must be between 0% and 100%.');
    }
  }
  return errors;
}

export function normalizeGuess(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isCropRevealAnswerCorrect(
  guess: string,
  config: CropRevealMiniGameConfig,
): boolean {
  const g = normalizeGuess(guess);
  if (!g) return false;
  const answers = [config.correctAnswer, ...config.acceptedAnswers]
    .map(normalizeGuess)
    .filter(Boolean);
  return answers.includes(g);
}

export function expandCropPercent(
  current: number,
  expandBy: number,
): number {
  return Math.min(100, current + expandBy);
}

export function anchorFocalPoint(
  anchor: CropAnchor,
  customX?: number,
  customY?: number,
): { x: number; y: number } {
  if (anchor === 'custom') {
    return { x: customX ?? 50, y: customY ?? 50 };
  }
  const map: Record<Exclude<CropAnchor, 'custom'>, { x: number; y: number }> = {
    center: { x: 50, y: 50 },
    'top-left': { x: 0, y: 0 },
    top: { x: 50, y: 0 },
    'top-right': { x: 100, y: 0 },
    left: { x: 0, y: 50 },
    right: { x: 100, y: 50 },
    'bottom-left': { x: 0, y: 100 },
    bottom: { x: 50, y: 100 },
    'bottom-right': { x: 100, y: 100 },
  };
  return map[anchor];
}

export function anchorToObjectPosition(
  anchor: CropAnchor,
  customX?: number,
  customY?: number,
): string {
  const { x, y } = anchorFocalPoint(anchor, customX, customY);
  return `${x}% ${y}%`;
}

/** Crop window as percentages of the source image (square window). */
export interface CropRect {
  left: number;
  top: number;
  size: number;
}

export function cropRectForAnchor(
  revealPercent: number,
  anchor: CropAnchor,
  customX?: number,
  customY?: number,
): CropRect {
  const size = Math.max(0, Math.min(100, revealPercent));
  if (size >= 100) {
    return { left: 0, top: 0, size: 100 };
  }

  const focal = anchorFocalPoint(anchor, customX, customY);
  let left = focal.x - size / 2;
  let top = focal.y - size / 2;
  left = Math.max(0, Math.min(100 - size, left));
  top = Math.max(0, Math.min(100 - size, top));

  return { left, top, size };
}

/** Scale and origin to zoom the crop region to fill the viewport without exposing its position. */
export function cropZoomTransform(
  revealPercent: number,
  anchor: CropAnchor,
  customX?: number,
  customY?: number,
): { scale: number; originX: number; originY: number } {
  const { left, top, size } = cropRectForAnchor(revealPercent, anchor, customX, customY);
  if (size >= 100) {
    return { scale: 1, originX: 50, originY: 50 };
  }

  return {
    scale: 100 / size,
    originX: left + size / 2,
    originY: top + size / 2,
  };
}

/** CSS clip-path inset for a crop window anchored at a focal point (equal % on each axis). */
export function cropInsetForAnchor(
  revealPercent: number,
  anchor: CropAnchor,
  customX?: number,
  customY?: number,
): string {
  const { left, top, size } = cropRectForAnchor(revealPercent, anchor, customX, customY);
  if (size >= 100) return '0%';

  const right = 100 - size - left;
  const bottom = 100 - size - top;

  return `${top}% ${right}% ${bottom}% ${left}%`;
}

/** CSS clip-path inset values for a centered crop viewport. */
export function cropInsetPercent(revealPercent: number): string {
  return cropInsetForAnchor(revealPercent, 'center');
}

export function applyWrongGuess(
  state: CropRevealRuntimeState,
  config: CropRevealMiniGameConfig,
  guess: string,
): CropRevealRuntimeState {
  const attempts = state.attempts + 1;
  const guesses = [...state.guesses, guess];
  let currentRevealPercent = state.currentRevealPercent;

  if (config.autoExpandOnWrongGuess) {
    currentRevealPercent = expandCropPercent(currentRevealPercent, config.expandPercentPerReveal);
  }

  const maxReached =
    config.maxAttempts !== undefined &&
    !state.maxAttemptsWaived &&
    attempts >= config.maxAttempts;

  return {
    ...state,
    guesses,
    attempts,
    currentRevealPercent,
    status: maxReached ? 'maxAttemptsReached' : 'playing',
  };
}

export function applyManualExpand(
  state: CropRevealRuntimeState,
  config: CropRevealMiniGameConfig,
): CropRevealRuntimeState {
  return {
    ...state,
    currentRevealPercent: expandCropPercent(
      state.currentRevealPercent,
      config.expandPercentPerReveal,
    ),
  };
}

export function applyCorrectGuess(
  state: CropRevealRuntimeState,
  config: CropRevealMiniGameConfig,
  guess: string,
): CropRevealRuntimeState {
  return {
    ...state,
    guesses: [...state.guesses, guess],
    attempts: state.attempts + 1,
    currentRevealPercent: config.showFullImageOnComplete ? 100 : state.currentRevealPercent,
    status: 'correct',
    completedAt: new Date().toISOString(),
  };
}
