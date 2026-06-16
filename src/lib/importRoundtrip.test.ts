import { describe, expect, it } from 'vitest';
import { migrateBoard } from './miniGame';
import type { Board } from '../types/board';
import { createDefaultBoardTheme } from './boardTheme';

describe('import roundtrip fields', () => {
  it('preserves theme and attachments after migrate', () => {
    const raw = {
      id: 'b1',
      title: 'Test',
      description: '',
      datasets: [],
      categories: [
        {
          id: 'cat1',
          name: 'Cat',
          style: { headerBackground: '#112233', headerTextColor: '#ffffff' },
          clues: [
            {
              id: 'cl1',
              type: 'clue' as const,
              value: 100,
              clue: 'Q',
              answer: 'A',
              hostNotes: '',
              isDailyDouble: false,
              tags: [],
              isUsed: false,
              attachments: [
                {
                  id: 'att1',
                  type: 'image' as const,
                  title: 'Pic',
                  url: 'https://example.com/p.png',
                },
              ],
              attachmentDisplayMode: 'progressive' as const,
            },
          ],
        },
      ],
      finalJeopardy: {
        category: 'Final',
        tile: {
          id: 'fj',
          type: 'clue' as const,
          value: 0,
          clue: '',
          answer: '',
          hostNotes: '',
          isDailyDouble: false,
          tags: [],
          isUsed: false,
        },
      },
      theme: createDefaultBoardTheme(),
      createdAt: '2020-01-01',
      updatedAt: '2020-01-01',
    } satisfies Board;

    const board = migrateBoard(raw);
    expect(board.theme?.colors.tileBackground).toBeTruthy();
    expect(board.categories[0].style?.headerBackground).toBe('#112233');
    expect(board.categories[0].clues[0].attachments).toHaveLength(1);
    expect(board.categories[0].clues[0].attachmentDisplayMode).toBe('progressive');
  });

  it('preserves wheels and tolerates missing wheels on old boards', () => {
    const withWheels = migrateBoard({
      id: 'b2',
      title: 'Wheel board',
      description: '',
      datasets: [],
      categories: [
        {
          id: 'cat1',
          name: 'Cat',
          clues: [
            {
              id: 'cl1',
              type: 'clue' as const,
              value: 100,
              clue: 'Q',
              answer: 'A',
              hostNotes: '',
              isDailyDouble: false,
              tags: [],
              isUsed: false,
            },
          ],
        },
      ],
      finalJeopardy: {
        category: '',
        tile: {
          id: 'fj',
          type: 'clue' as const,
          value: 0,
          clue: '',
          answer: '',
          hostNotes: '',
          isDailyDouble: false,
          tags: [],
          isUsed: false,
        },
      },
      wheels: [{ id: 'w1', name: 'Picker', entries: ['Alice', 'Bob'] }],
      createdAt: '2020-01-01',
      updatedAt: '2020-01-01',
    } satisfies Board);

    expect(withWheels.wheels).toEqual([{ id: 'w1', name: 'Picker', entries: ['Alice', 'Bob'] }]);

    const withoutWheels = migrateBoard({
      ...withWheels,
      wheels: undefined,
    });
    expect(withoutWheels.wheels).toEqual([]);
  });
});
