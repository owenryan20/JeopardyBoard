import type { Board } from '../types/board';
import { migrateBoard } from './boardFactory';
import { boardDatasetToAppDataset } from './datasetConvert';
import { upsertAppDataset } from './datasetStorage';
import { migrateClueFromImport } from './miniGame';

export function validateBoardImport(data: unknown): { ok: true; board: Board } | { ok: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Invalid JSON: expected a board object.' };
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.title !== 'string') {
    return { ok: false, error: 'Board must have a title string.' };
  }
  if (!Array.isArray(obj.categories) || obj.categories.length === 0) {
    return { ok: false, error: 'Board must have at least one category.' };
  }

  for (let i = 0; i < obj.categories.length; i++) {
    const cat = obj.categories[i] as Record<string, unknown>;
    if (!cat || typeof cat.name !== 'string') {
      return { ok: false, error: `Category ${i + 1} must have a name.` };
    }
    if (!Array.isArray(cat.clues)) {
      return { ok: false, error: `Category "${cat.name}" must have clues array.` };
    }
    for (let j = 0; j < cat.clues.length; j++) {
      const clue = cat.clues[j] as Record<string, unknown>;
      if (!clue || typeof clue.value !== 'number') {
        return { ok: false, error: `Clue ${j + 1} in "${cat.name}" must have a numeric value.` };
      }
    }
  }

  const board = normalizeImportedBoard(data as Board);

  for (const ds of board.datasets ?? []) {
    upsertAppDataset(boardDatasetToAppDataset(ds, ds.type ?? 'custom', ds.source ? 'livePreset' : 'backup'));
  }

  return { ok: true, board };
}

function normalizeImportedBoard(raw: Board): Board {
  const now = new Date().toISOString();
  const board: Board = {
    id: raw.id || crypto.randomUUID(),
    title: raw.title || 'Imported Board',
    description: raw.description ?? '',
    datasets: Array.isArray(raw.datasets)
      ? raw.datasets.map((d) => ({
          id: d.id || crypto.randomUUID(),
          name: d.name || 'Dataset',
          sourceType: 'csv' as const,
          columns: Array.isArray(d.columns) ? d.columns : [],
          rows: Array.isArray(d.rows) ? d.rows : [],
          createdAt: d.createdAt ?? now,
          updatedAt: now,
          type: d.type,
          source: d.source,
          lastFetchedAt: d.lastFetchedAt,
          lastEditedAt: d.lastEditedAt,
          hasLocalEdits: d.hasLocalEdits,
        }))
      : [],
    categories: raw.categories.map((cat) => ({
      id: cat.id || crypto.randomUUID(),
      name: cat.name,
      clues: cat.clues.map((clue) => migrateClueFromImport(clue)),
    })),
    finalJeopardy: raw.finalJeopardy ?? { category: '', clue: '', answer: '' },
    createdAt: raw.createdAt ?? now,
    updatedAt: now,
  };
  return migrateBoard(board);
}
