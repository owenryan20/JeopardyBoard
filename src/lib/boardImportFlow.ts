import type { Board } from '../types/board';
import { confirmDialog } from './dialog';
import { getBoard } from './storage';

export type BoardImportAction =
  | { type: 'save'; board: Board }
  | { type: 'open-existing'; boardId: string };

function formatEdited(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** When import ID matches a saved board, ask whether to replace or keep the local copy. */
export async function resolveBoardImportAction(imported: Board): Promise<BoardImportAction> {
  const existing = getBoard(imported.id);
  if (!existing) {
    return { type: 'save', board: imported };
  }

  const replace = await confirmDialog({
    title: 'Board already saved',
    description:
      `This backup matches a board already in this browser.\n\n` +
      `Saved copy: "${existing.title}" (edited ${formatEdited(existing.updatedAt)})\n` +
      `Imported backup: "${imported.title}" (edited ${formatEdited(imported.updatedAt)})\n\n` +
      `Replace the saved copy with the imported backup?`,
    confirmLabel: 'Use imported backup',
    cancelLabel: 'Keep saved copy',
    closeOnBackdrop: false,
  });

  if (replace) {
    return { type: 'save', board: imported };
  }
  return { type: 'open-existing', boardId: existing.id };
}

export async function applyBoardImportAction(
  action: BoardImportAction,
  save: (board: Board) => Board,
): Promise<string> {
  if (action.type === 'save') {
    return save(action.board).id;
  }
  return action.boardId;
}
