import {
  CATEGORY_COUNT,
  DEFAULT_POINT_VALUES,
  MAX_CATEGORY_COUNT,
  MAX_CLUES_PER_CATEGORY,
  MIN_CATEGORY_COUNT,
  MIN_CLUES_PER_CATEGORY,
  type Board,
  type Category,
  type Clue,
} from '../types/board';
import { isCharacterGuessConfig, isMiniGameTile, isStandardClue } from '../types/board';
import { createDefaultBoardTheme } from './boardTheme';
import { createDefaultFinalJeopardy } from './finalJeopardy';
import { migrateBoard, tileEditorStatus } from './miniGame';
import { hasAttachments } from './attachments';
import { hasClueMedia } from './mediaUtils';
import { createId } from './ids';

export function createEmptyClue(value: number): Clue {
  return {
    id: createId(),
    type: 'clue',
    value,
    clue: '',
    answer: '',
    hostNotes: '',
    isDailyDouble: false,
    tags: [],
    isUsed: false,
  };
}

/** Clear a tile back to an empty standard clue while keeping its id and point value. */
export function resetClueTile(clue: Clue): Clue {
  return {
    ...createEmptyClue(clue.value),
    id: clue.id,
    isUsed: false,
  };
}

export function createDefaultCategory(index: number): Category {
  const names = ['Science', 'History', 'Movies', 'Sports', 'Geography', 'Music'];
  return {
    id: createId(),
    name: names[index] ?? `Category ${index + 1}`,
    clues: DEFAULT_POINT_VALUES.map((value) => createEmptyClue(value)),
  };
}

export function createDefaultBoard(title = 'Untitled Board'): Board {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title,
    description: '',
    categories: Array.from({ length: CATEGORY_COUNT }, (_, i) =>
      createDefaultCategory(i),
    ),
    datasets: [],
    finalJeopardy: createDefaultFinalJeopardy(),
    theme: createDefaultBoardTheme(),
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyCategory(name = 'New Category'): Category {
  return {
    id: createId(),
    name,
    clues: DEFAULT_POINT_VALUES.map((value) => createEmptyClue(value)),
  };
}

export function addCategory(board: Board): Board {
  if (board.categories.length >= MAX_CATEGORY_COUNT) return board;
  const index = board.categories.length + 1;
  return {
    ...board,
    categories: [
      ...board.categories,
      createEmptyCategory(`Category ${index}`),
    ],
  };
}

export function removeCategory(board: Board, categoryId: string): Board {
  if (board.categories.length <= MIN_CATEGORY_COUNT) return board;
  return {
    ...board,
    categories: board.categories.filter((c) => c.id !== categoryId),
  };
}

export function duplicateBoard(board: Board, title?: string): Board {
  const now = new Date().toISOString();
  const cloned = JSON.parse(JSON.stringify(board)) as Board;
  cloned.id = createId();
  cloned.title = title ?? `${board.title} (Copy)`;
  cloned.createdAt = now;
  cloned.updatedAt = now;
  cloned.datasets = (board.datasets ?? []).map((d) => ({
    ...d,
    id: createId(),
  }));
  const datasetIdMap = new Map(
    (board.datasets ?? []).map((d, i) => [d.id, cloned.datasets[i]!.id]),
  );
  cloned.categories = cloned.categories.map((cat) => ({
    ...cat,
    id: createId(),
    clues: cat.clues.map((clue) => {
      const copy = {
        ...clue,
        id: createId(),
        isUsed: false,
      };
      if (copy.miniGame && isCharacterGuessConfig(copy.miniGame) && copy.miniGame.datasetId) {
        copy.miniGame = {
          ...copy.miniGame,
          datasetId: datasetIdMap.get(copy.miniGame.datasetId) ?? copy.miniGame.datasetId,
        };
      }
      return copy;
    }),
  }));
  return migrateBoard(cloned);
}

export function getAllClues(board: Board): Clue[] {
  return board.categories.flatMap((c) => c.clues);
}

export function findClue(
  board: Board,
  categoryId: string,
  clueId: string,
): { category: Category; clue: Clue } | null {
  const category = board.categories.find((c) => c.id === categoryId);
  if (!category) return null;
  const clue = category.clues.find((cl) => cl.id === clueId);
  if (!clue) return null;
  return { category, clue };
}

export function getNextClue(
  board: Board,
  categoryId: string,
  clueId: string,
): { categoryId: string; clueId: string } | null {
  const catIndex = board.categories.findIndex((c) => c.id === categoryId);
  if (catIndex === -1) return null;
  const category = board.categories[catIndex];
  const clueIndex = category.clues.findIndex((c) => c.id === clueId);
  if (clueIndex === -1) return null;

  if (clueIndex < category.clues.length - 1) {
    return { categoryId, clueId: category.clues[clueIndex + 1].id };
  }
  for (let i = catIndex + 1; i < board.categories.length; i++) {
    const next = board.categories[i];
    if (next.clues.length > 0) {
      return { categoryId: next.id, clueId: next.clues[0].id };
    }
  }
  return null;
}

export function isClueComplete(clue: Clue, board?: Board): boolean {
  if (board && isMiniGameTile(clue)) {
    return tileEditorStatus(clue, board) === 'complete';
  }
  return clue.clue.trim().length > 0;
}

export function clueStatus(clue: Clue, board?: Board): 'empty' | 'partial' | 'complete' {
  if (board) return tileEditorStatus(clue, board);
  if (isMiniGameTile(clue)) {
    if (clue.miniGame && isCharacterGuessConfig(clue.miniGame)) {
      return clue.miniGame.correctAnswerId ? 'complete' : 'empty';
    }
    return 'empty';
  }
  const hasClue = clue.clue.trim().length > 0;
  const hasAnswer = clue.answer.trim().length > 0;
  if (!hasClue && !hasAnswer) return 'empty';
  if (hasClue && hasAnswer) return 'complete';
  return 'partial';
}

export function isTileEmpty(clue: Clue, board?: Board): boolean {
  if (isMiniGameTile(clue)) {
    if (board) return tileEditorStatus(clue, board) === 'empty';
    if (clue.miniGame && isCharacterGuessConfig(clue.miniGame)) {
      return !clue.miniGame.datasetId;
    }
    return !clue.miniGame?.correctAnswer?.trim();
  }
  return isStandardClue(clue) && !clue.clue.trim() && !clue.answer.trim();
}

export function hasTileContent(clue: Clue, board?: Board): boolean {
  if (!isTileEmpty(clue, board)) return true;
  if (hasAttachments(clue)) return true;
  if (hasClueMedia(clue.media)) return true;
  if (clue.hostNotes.trim()) return true;
  if (clue.tags.length > 0) return true;
  if (clue.isDailyDouble) return true;
  return false;
}

/** True when reset should be offered (includes incomplete mini games). */
export function canResetTile(clue: Clue, board?: Board): boolean {
  if (isMiniGameTile(clue)) return true;
  return hasTileContent(clue, board);
}

export function suggestCluePointValue(clues: Clue[]): number {
  if (clues.length === 0) return DEFAULT_POINT_VALUES[0] ?? 100;
  return Math.max(...clues.map((c) => c.value)) + 100;
}

export function getBoardRowCount(board: Board): number {
  return board.categories.reduce((max, cat) => Math.max(max, cat.clues.length), 0);
}

export function addClueToCategory(board: Board, categoryId: string): Board {
  const category = board.categories.find((c) => c.id === categoryId);
  if (!category || category.clues.length >= MAX_CLUES_PER_CATEGORY) return board;
  const value = suggestCluePointValue(category.clues);
  return {
    ...board,
    categories: board.categories.map((cat) =>
      cat.id === categoryId
        ? { ...cat, clues: [...cat.clues, createEmptyClue(value)] }
        : cat,
    ),
  };
}

export function removeClueFromCategory(
  board: Board,
  categoryId: string,
  clueId: string,
): Board | null {
  const category = board.categories.find((c) => c.id === categoryId);
  if (!category || category.clues.length <= MIN_CLUES_PER_CATEGORY) return null;
  return {
    ...board,
    categories: board.categories.map((cat) =>
      cat.id === categoryId
        ? { ...cat, clues: cat.clues.filter((c) => c.id !== clueId) }
        : cat,
    ),
  };
}

export { migrateBoard };
