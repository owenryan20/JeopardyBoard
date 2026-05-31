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

export type TileAttachmentType = 'image' | 'video' | 'audio' | 'link' | 'text' | 'file';

export interface TileAttachment {
  id: string;
  type: TileAttachmentType;
  title: string;
  url: string;
  storage?: MediaStorage;
  mediaId?: string;
  mimeType?: string;
  alt?: string;
  thumbnailUrl?: string;
  textContent?: string;
}

export type AttachmentDisplayMode = 'all-at-once' | 'progressive';

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

export type MiniGameType = 'characterGuess' | 'cropReveal';

export interface CharacterGuessMiniGameConfig {
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

export type CropAnchor =
  | 'center'
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right'
  | 'custom';

export interface CropRevealMiniGameConfig {
  gameType: 'cropReveal';
  title: string;
  pointValue: number;
  hostNotes: string;
  image: TileAttachment;
  correctAnswer: string;
  acceptedAnswers: string[];
  startingCropPercent: number;
  expandPercentPerReveal: number;
  anchor: CropAnchor;
  customAnchorX?: number;
  customAnchorY?: number;
  maxAttempts?: number;
  autoExpandOnWrongGuess: boolean;
  showFullImageOnComplete: boolean;
}

export type MiniGameConfig = CharacterGuessMiniGameConfig | CropRevealMiniGameConfig;

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

export type BoardBackground =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; from: string; to: string; angle?: number }
  | {
      type: 'image';
      url: string;
      storage?: MediaStorage;
      mediaId?: string;
      overlayColor?: string;
      overlayOpacity?: number;
    };

export interface BoardPreviewImage {
  url: string;
  storage?: MediaStorage;
  mediaId?: string;
}

export interface BoardColorTheme {
  tileBackground: string;
  tileBackgroundUsed: string;
  tileBackgroundSelected: string;
  tileBackgroundHover: string;
  tileBorder: string;
  pointValueText: string;
  clueText: string;
  categoryHeaderBackground: string;
  categoryHeaderText: string;
  topBarBackground: string;
  footerBackground: string;
}

export interface BoardTheme {
  background: BoardBackground;
  colors: BoardColorTheme;
}

export interface CategoryHeaderStyle {
  headerBackground?: string;
  headerTextColor?: string;
  headerBackgroundImage?: string;
}

export interface Clue {
  id: string;
  type: TileType;
  value: number;
  clue: string;
  answer: string;
  hostNotes: string;
  isDailyDouble: boolean;
  /** @deprecated Use attachments instead — migrated on load. */
  media?: Media;
  attachments?: TileAttachment[];
  attachmentDisplayMode?: AttachmentDisplayMode;
  tags: string[];
  isUsed: boolean;
  miniGame?: MiniGameConfig;
}

export interface Category {
  id: string;
  name: string;
  clues: Clue[];
  style?: CategoryHeaderStyle;
}

export interface FinalJeopardy {
  category: string;
  /** Full tile — supports standard clues, media, mini games, and future tile types. */
  tile: Clue;
}

export interface Board {
  id: string;
  title: string;
  description: string;
  categories: Category[];
  datasets: BoardDataset[];
  finalJeopardy: FinalJeopardy;
  theme?: BoardTheme;
  /** Optional thumbnail on dashboard board cards. Falls back to themed mini board. */
  previewImage?: BoardPreviewImage;
  createdAt: string;
  updatedAt: string;
}

export interface TeamTheme {
  color: string;
  textColor: string;
  background?: BoardBackground;
}

export interface Team {
  id: string;
  name: string;
  score: number;
  theme?: TeamTheme;
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

export type CropRevealStatus =
  | 'not-started'
  | 'playing'
  | 'maxAttemptsReached'
  | 'correct'
  | 'failed'
  | 'revealed';

export interface CropRevealRuntimeState {
  tileId: string;
  guesses: string[];
  attempts: number;
  currentRevealPercent: number;
  status: CropRevealStatus;
  /** When true, max-attempt limit no longer ends the round (host chose Continue). */
  maxAttemptsWaived?: boolean;
  completedAt?: string;
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
  cropRevealProgress: Record<string, CropRevealRuntimeState>;
  attachmentRevealIndex: Record<string, number>;
}

export const DEFAULT_POINT_VALUES = [100, 200, 300, 400, 500];
export const CATEGORY_COUNT = 6;
export const CLUES_PER_CATEGORY = 5;
export const MIN_CLUES_PER_CATEGORY = 1;
export const MAX_CLUES_PER_CATEGORY = 10;
export const MIN_CATEGORY_COUNT = 1;
export const MAX_CATEGORY_COUNT = 10;

export function isMiniGameTile(clue: Clue): boolean {
  return clue.type === 'miniGame';
}

export function isStandardClue(clue: Clue): boolean {
  return clue.type !== 'miniGame';
}

export function isCharacterGuessTile(clue: Clue): boolean {
  return clue.type === 'miniGame' && clue.miniGame?.gameType === 'characterGuess';
}

export function isCropRevealTile(clue: Clue): boolean {
  return clue.type === 'miniGame' && clue.miniGame?.gameType === 'cropReveal';
}

export function isCharacterGuessConfig(config: MiniGameConfig): config is CharacterGuessMiniGameConfig {
  return config.gameType === 'characterGuess';
}

export function isCropRevealConfig(config: MiniGameConfig): config is CropRevealMiniGameConfig {
  return config.gameType === 'cropReveal';
}
