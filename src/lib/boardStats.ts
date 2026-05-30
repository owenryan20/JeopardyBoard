import type { Board, Clue } from '../types/board';
import { clueStatus, getAllClues } from './boardFactory';
import { hasClueMedia } from './mediaUtils';
export interface BoardReadiness {
  total: number;
  completed: number;
  missingAnswers: number;
  mediaWithoutAlt: number;
  percent: number;
}

export function getBoardReadiness(board: Board): BoardReadiness {
  const clues = getAllClues(board);
  const total = clues.length;
  const completed = clues.filter((c) => clueStatus(c, board) === 'complete').length;
  const missingAnswers = clues.filter(
    (c) => c.type !== 'miniGame' && c.clue.trim() && !c.answer.trim(),
  ).length;
  const mediaWithoutAlt = clues.filter(
    (c) => hasClueMedia(c.media) && !c.media?.altText?.trim(),
  ).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { total, completed, missingAnswers, mediaWithoutAlt, percent };
}

export function getClueStatusLabel(clue: Clue, board?: Board): string {
  const status = clueStatus(clue, board);
  switch (status) {
    case 'complete':
      return 'Completed';
    case 'partial':
      return 'Missing answer';
    default:
      return 'Empty';
  }
}
