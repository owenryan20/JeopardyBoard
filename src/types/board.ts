export type MediaType = 'image' | 'video' | 'audio';

export interface Media {
  type: MediaType;
  url: string;
  filename?: string;
  altText?: string;
}

export interface Clue {
  id: string;
  value: number;
  clue: string;
  answer: string;
  hostNotes: string;
  isDailyDouble: boolean;
  media?: Media;
  tags: string[];
  isUsed: boolean;
}

export interface Category {
  id: string;
  name: string;
  clues: Clue[];
}

export interface FinalJeopardy {
  category: string;
  clue: string;
  answer: string;
}

export interface Board {
  id: string;
  title: string;
  description: string;
  categories: Category[];
  finalJeopardy: FinalJeopardy;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  score: number;
}

export type FinalJeopardyPhase =
  | 'none'
  | 'category'
  | 'wagers'
  | 'clue'
  | 'answer'
  | 'results';

export interface GameSession {
  boardId: string;
  teams: Team[];
  revealedClueId: string | null;
  showAnswer: boolean;
  finalJeopardyRevealed: FinalJeopardyPhase;
  /** Wager amount per team id (set before clue is revealed). */
  finalJeopardyWagers: Record<string, number>;
  /** true = correct, false = incorrect, null = not yet judged. */
  finalJeopardyOutcomes: Record<string, boolean | null>;
}

export const DEFAULT_POINT_VALUES = [100, 200, 300, 400, 500];
export const CATEGORY_COUNT = 6;
export const CLUES_PER_CATEGORY = 5;
export const MIN_CATEGORY_COUNT = 1;
export const MAX_CATEGORY_COUNT = 10;
