import { useCallback, useSyncExternalStore } from 'react';
import type { Board } from '../types/board';
import { createDefaultBoard, duplicateBoard } from '../lib/boardFactory';
import {
  deleteBoard as deleteStoredBoard,
  loadBoards,
  loadRecentBoardIds,
  upsertBoard,
} from '../lib/storage';
import { gcUnreferencedMedia } from '../lib/mediaStorage';

const EMPTY_BOARDS: Board[] = [];

let cachedBoards: Board[] = loadBoards();
let listeners: Array<() => void> = [];

function refreshCache(): void {
  cachedBoards = loadBoards();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notify() {
  refreshCache();
  listeners.forEach((l) => l());
}

function getSnapshot(): Board[] {
  return cachedBoards;
}

function getServerSnapshot(): Board[] {
  return EMPTY_BOARDS;
}

export function useBoards() {
  const boards = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const refresh = useCallback(() => notify(), []);

  const createBoard = useCallback((title?: string) => {
    const board = createDefaultBoard(title);
    upsertBoard(board);
    notify();
    return board;
  }, []);

  const saveBoard = useCallback((board: Board) => {
    upsertBoard(board);
    notify();
  }, []);

  const removeBoard = useCallback((id: string) => {
    deleteStoredBoard(id);
    void gcUnreferencedMedia();
    notify();
  }, []);

  const duplicate = useCallback((id: string) => {
    const source = cachedBoards.find((b) => b.id === id);
    if (!source) return null;
    const copy = duplicateBoard(source);
    upsertBoard(copy);
    notify();
    return copy;
  }, []);

  const recentIds = loadRecentBoardIds();
  const recentBoards = recentIds
    .map((id) => boards.find((b) => b.id === id))
    .filter((b): b is Board => Boolean(b));

  return {
    boards,
    recentBoards,
    createBoard,
    saveBoard,
    removeBoard,
    duplicate,
    refresh,
  };
}

export function importBoard(board: Board): Board {
  upsertBoard(board);
  notify();
  return board;
}
