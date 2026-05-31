import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Board } from '../types/board';
import { resolveBoardImportAction } from './boardImportFlow';
import * as storage from './storage';
import * as dialog from './dialog';

vi.mock('./storage', () => ({
  getBoard: vi.fn(),
}));

vi.mock('./dialog', () => ({
  confirmDialog: vi.fn(),
}));

const sampleBoard = (id: string, title: string): Board =>
  ({
    id,
    title,
    description: '',
    categories: [{ id: 'c1', name: 'Cat', clues: [{ id: 'cl1', type: 'clue', value: 100, clue: '', answer: '', hostNotes: '', isDailyDouble: false, tags: [], isUsed: false }] }],
    datasets: [],
    finalJeopardy: { category: '', tile: { id: 'f1', type: 'clue', value: 0, clue: '', answer: '', hostNotes: '', isDailyDouble: false, tags: [], isUsed: false } },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  }) as Board;

describe('resolveBoardImportAction', () => {
  beforeEach(() => {
    vi.mocked(storage.getBoard).mockReset();
    vi.mocked(dialog.confirmDialog).mockReset();
  });

  it('saves directly when id is new', async () => {
    vi.mocked(storage.getBoard).mockReturnValue(undefined);
    const imported = sampleBoard('new-id', 'Imported');

    const action = await resolveBoardImportAction(imported);

    expect(action).toEqual({ type: 'save', board: imported });
    expect(dialog.confirmDialog).not.toHaveBeenCalled();
  });

  it('asks to replace when id already exists and user chooses import', async () => {
    const existing = sampleBoard('dup-id', 'Local');
    const imported = sampleBoard('dup-id', 'Backup');
    vi.mocked(storage.getBoard).mockReturnValue(existing);
    vi.mocked(dialog.confirmDialog).mockResolvedValue(true);

    const action = await resolveBoardImportAction(imported);

    expect(action).toEqual({ type: 'save', board: imported });
    expect(dialog.confirmDialog).toHaveBeenCalledOnce();
  });

  it('keeps existing when user declines replace', async () => {
    const existing = sampleBoard('dup-id', 'Local');
    const imported = sampleBoard('dup-id', 'Backup');
    vi.mocked(storage.getBoard).mockReturnValue(existing);
    vi.mocked(dialog.confirmDialog).mockResolvedValue(false);

    const action = await resolveBoardImportAction(imported);

    expect(action).toEqual({ type: 'open-existing', boardId: 'dup-id' });
  });
});
