export type MediaType = 'image' | 'video' | 'audio';

export type MediaStorage = 'url' | 'local';

export interface Media {
  type: MediaType;
  /** `local` = uploaded file in browser IndexedDB; `url` = external link (default when url is set). */
  storage?: MediaStorage;
  url?: string;
  /** IndexedDB key for uploaded media blobs. */
  mediaId?: string;
  mimeType?: string;
  filename?: string;
  altText?: string;
}

export type TileType = 'clue' | 'miniGame';

export type AttributeBehavior =
  | 'searchName'
  | 'exact'
  | 'partial'
  | 'numeric'
  | 'tagOverlap'
  | 'image'
  | 'hidden';

export interface MiniGameAttribute {
  column: string;
  displayName: string;
  visible: boolean;
  behavior: AttributeBehavior;
}

export interface MiniGameFieldMapping {
  nameField: string;
  answerField: string;
  imageField?: string;
  searchableFields: string[];
}

export interface MiniGameConfig {
  gameType: 'characterGuess';
  title: string;
  pointValue: number;
  datasetId: string;
  correctAnswerId: string;
  guessLimit: number;
  showAnswerImage: boolean;
  revealBehavior: 'hostReveal';
  hostNotes: string;
  fieldMapping: MiniGameFieldMapping;
  attributes: MiniGameAttribute[];
}

import type { DatasetKind, DatasetSourceMetadata } from './dataset';

export interface BoardDataset {
  id: string;
  name: string;
  sourceType: 'csv';
  columns: string[];
  rows: Array<Record<string, string>>;
  createdAt: string;
  updatedAt: string;
  type?: DatasetKind;
  source?: DatasetSourceMetadata;
  lastFetchedAt?: string;
  lastEditedAt?: string;
  hasLocalEdits?: boolean;
}

export interface Clue {
  id: string;
  type: TileType;
  value: number;
  clue: string;
  answer: string;
  hostNotes: string;
  isDailyDouble: boolean;
  media?: Media;
  tags: string[];
  isUsed: boolean;
  miniGame?: MiniGameConfig;
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
  datasets: BoardDataset[];
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

export interface MiniGameProgress {
  guesses: string[];
  revealed: boolean;
  won: boolean | null;
  finished: boolean;
}

export interface GameSession {
  boardId: string;
  teams: Team[];
  revealedClueId: string | null;
  showAnswer: boolean;
  finalJeopardyRevealed: FinalJeopardyPhase;
  finalJeopardyWagers: Record<string, number>;
  finalJeopardyOutcomes: Record<string, boolean | null>;
  miniGameProgress: Record<string, MiniGameProgress>;
}

export const DEFAULT_POINT_VALUES = [100, 200, 300, 400, 500];
export const CATEGORY_COUNT = 6;
export const CLUES_PER_CATEGORY = 5;
export const MIN_CATEGORY_COUNT = 1;
export const MAX_CATEGORY_COUNT = 10;

export function isMiniGameTile(clue: Clue): boolean {
  return clue.type === 'miniGame';
}

export function isStandardClue(clue: Clue): boolean {
  return clue.type !== 'miniGame';
}
