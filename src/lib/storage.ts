import type { Board, GameSession } from '../types/board';
import { normalizeGameSession } from './gameSession';

const BOARDS_KEY = 'jeff-hardy-boards';
const RECENT_KEY = 'jeff-hardy-recent';
const GAME_KEY_PREFIX = 'jeff-hardy-game-';

export function loadBoards(): Board[] {
  try {
    const raw = localStorage.getItem(BOARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Board[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBoards(boards: Board[]): void {
  localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
}

export function getBoard(id: string): Board | undefined {
  return loadBoards().find((b) => b.id === id);
}

export function upsertBoard(board: Board): void {
  const boards = loadBoards();
  const index = boards.findIndex((b) => b.id === board.id);
  const updated = { ...board, updatedAt: new Date().toISOString() };
  if (index >= 0) {
    boards[index] = updated;
  } else {
    boards.push(updated);
  }
  saveBoards(boards);
}

export function deleteBoard(id: string): void {
  saveBoards(loadBoards().filter((b) => b.id !== id));
  localStorage.removeItem(`${GAME_KEY_PREFIX}${id}`);
}

export function addRecentBoard(id: string): void {
  const recent = loadRecentBoardIds().filter((r) => r !== id);
  recent.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 10)));
}

export function loadRecentBoardIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadGameSession(boardId: string): GameSession | null {
  try {
    const raw = localStorage.getItem(`${GAME_KEY_PREFIX}${boardId}`);
    if (!raw) return null;
    return normalizeGameSession(JSON.parse(raw) as GameSession);
  } catch {
    return null;
  }
}

export function saveGameSession(session: GameSession): void {
  localStorage.setItem(`${GAME_KEY_PREFIX}${session.boardId}`, JSON.stringify(session));
}

export function clearGameSession(boardId: string): void {
  localStorage.removeItem(`${GAME_KEY_PREFIX}${boardId}`);
}
