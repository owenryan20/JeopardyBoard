import type { Board } from '../types/board';

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
  return { ok: true, board };
}

function normalizeImportedBoard(raw: Board): Board {
  const now = new Date().toISOString();
  return {
    id: raw.id || crypto.randomUUID(),
    title: raw.title || 'Imported Board',
    description: raw.description ?? '',
    categories: raw.categories.map((cat) => ({
      id: cat.id || crypto.randomUUID(),
      name: cat.name,
      clues: cat.clues.map((clue) => ({
        id: clue.id || crypto.randomUUID(),
        value: clue.value,
        clue: clue.clue ?? '',
        answer: clue.answer ?? '',
        hostNotes: clue.hostNotes ?? '',
        isDailyDouble: Boolean(clue.isDailyDouble),
        media: clue.media,
        tags: Array.isArray(clue.tags) ? clue.tags : [],
        isUsed: false,
      })),
    })),
    finalJeopardy: raw.finalJeopardy ?? { category: '', clue: '', answer: '' },
    createdAt: raw.createdAt ?? now,
    updatedAt: now,
  };
}
