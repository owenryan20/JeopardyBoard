import type { Clue, FinalJeopardy } from '../types/board';

export const FINAL_JEOPARDY_TILE_ID = 'final-jeopardy';

export function createEmptyFinalTile(): Clue {
  return {
    id: FINAL_JEOPARDY_TILE_ID,
    type: 'clue',
    value: 0,
    clue: '',
    answer: '',
    hostNotes: '',
    isDailyDouble: false,
    tags: [],
    isUsed: false,
  };
}

export function createDefaultFinalJeopardy(): FinalJeopardy {
  return {
    category: '',
    tile: createEmptyFinalTile(),
  };
}

/** Legacy template shape still accepted when building boards. */
export function finalJeopardyFromLegacy(data: {
  category?: string;
  clue?: string;
  answer?: string;
}): FinalJeopardy {
  return {
    category: data.category ?? '',
    tile: {
      ...createEmptyFinalTile(),
      clue: data.clue ?? '',
      answer: data.answer ?? '',
    },
  };
}

export function isFinalJeopardyClueId(clueId: string): boolean {
  return clueId === FINAL_JEOPARDY_TILE_ID;
}
