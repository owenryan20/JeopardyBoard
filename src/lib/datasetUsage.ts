import type { Board } from '../types/board';
import { isCharacterGuessConfig, isMiniGameTile } from '../types/board';
import { loadBoards } from './storage';

export interface DatasetUsage {
  boardCount: number;
  miniGameCount: number;
  boardTitles: string[];
}

export function getDatasetUsage(datasetId: string): DatasetUsage {
  const boards = loadBoards();
  const boardTitles = new Set<string>();
  let miniGameCount = 0;

  for (const board of boards) {
    let usedInBoard = false;
    for (const cat of board.categories) {
      for (const clue of cat.clues) {
        if (
          isMiniGameTile(clue)
          && clue.miniGame
          && isCharacterGuessConfig(clue.miniGame)
          && clue.miniGame.datasetId === datasetId
        ) {
          miniGameCount++;
          usedInBoard = true;
        }
      }
    }
    if (usedInBoard) boardTitles.add(board.title);
  }

  return {
    boardCount: boardTitles.size,
    miniGameCount,
    boardTitles: [...boardTitles],
  };
}

export function formatDatasetUsage(usage: DatasetUsage): string {
  if (usage.miniGameCount === 0) return 'Not used yet';
  if (usage.boardCount === 0) return `Used by ${usage.miniGameCount} Mini Game${usage.miniGameCount === 1 ? '' : 's'}`;
  return `Used in ${usage.boardCount} board${usage.boardCount === 1 ? '' : 's'} · ${usage.miniGameCount} Mini Game${usage.miniGameCount === 1 ? '' : 's'}`;
}

export function findMiniGamesUsingDataset(datasetId: string, boards: Board[] = loadBoards()) {
  const results: Array<{ boardId: string; boardTitle: string; clueId: string }> = [];
  for (const board of boards) {
    for (const cat of board.categories) {
      for (const clue of cat.clues) {
        if (
          isMiniGameTile(clue)
          && clue.miniGame
          && isCharacterGuessConfig(clue.miniGame)
          && clue.miniGame.datasetId === datasetId
        ) {
          results.push({ boardId: board.id, boardTitle: board.title, clueId: clue.id });
        }
      }
    }
  }
  return results;
}
