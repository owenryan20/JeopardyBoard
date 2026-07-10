import { describe, expect, it } from 'vitest';
import {
  createDefaultBoard,
  moveTileToCategoryEnd,
  relocateTile,
  swapTiles,
} from './boardFactory';
import { MAX_CLUES_PER_CATEGORY, MIN_CLUES_PER_CATEGORY } from '../types/board';

function ids(board: ReturnType<typeof createDefaultBoard>, categoryIndex: number): string[] {
  return board.categories[categoryIndex]!.clues.map((c) => c.id);
}

describe('swapTiles', () => {
  it('swaps two tiles in the same category', () => {
    const board = createDefaultBoard();
    const cat = board.categories[0]!;
    const a = cat.clues[0]!;
    const b = cat.clues[2]!;
    const next = swapTiles(
      board,
      { categoryId: cat.id, clueId: a.id },
      { categoryId: cat.id, clueId: b.id },
    );
    expect(next).not.toBeNull();
    expect(ids(next!, 0)[0]).toBe(b.id);
    expect(ids(next!, 0)[2]).toBe(a.id);
  });

  it('swaps tiles across categories', () => {
    const board = createDefaultBoard();
    const left = board.categories[0]!;
    const right = board.categories[1]!;
    const a = left.clues[1]!;
    const b = right.clues[3]!;
    const next = swapTiles(
      board,
      { categoryId: left.id, clueId: a.id },
      { categoryId: right.id, clueId: b.id },
    );
    expect(next).not.toBeNull();
    expect(ids(next!, 0)[1]).toBe(b.id);
    expect(ids(next!, 1)[3]).toBe(a.id);
  });
});

describe('relocateTile', () => {
  it('shifts within a category when inserting before', () => {
    const board = createDefaultBoard();
    const cat = board.categories[0]!;
    const [a, b, c] = cat.clues;
    const next = relocateTile(
      board,
      { categoryId: cat.id, clueId: c!.id },
      { categoryId: cat.id, clueId: a!.id },
      'insert-before',
    );
    expect(ids(next!, 0)).toEqual([c!.id, a!.id, b!.id, ...ids(board, 0).slice(3)]);
  });

  it('shifts within a category when inserting after', () => {
    const board = createDefaultBoard();
    const cat = board.categories[0]!;
    const [a, b, c] = cat.clues;
    const next = relocateTile(
      board,
      { categoryId: cat.id, clueId: a!.id },
      { categoryId: cat.id, clueId: c!.id },
      'insert-after',
    );
    expect(ids(next!, 0).slice(0, 3)).toEqual([b!.id, c!.id, a!.id]);
  });

  it('moves a tile into another category when there is room', () => {
    let board = createDefaultBoard();
    const left = board.categories[0]!;
    const right = board.categories[1]!;
    // Make room in right by removing one tile via relocate from a third category... 
    // Default boards are full at 5; remove one from right first by using factory limits.
    // Shrink right by filtering through relocate from left only works if right < max.
    // So remove a clue from right first using board mutation:
    board = {
      ...board,
      categories: board.categories.map((cat, i) =>
        i === 1 ? { ...cat, clues: cat.clues.slice(0, 4) } : cat,
      ),
    };
    const moved = left.clues[0]!;
    const target = board.categories[1]!.clues[1]!;
    const next = relocateTile(
      board,
      { categoryId: left.id, clueId: moved.id },
      { categoryId: right.id, clueId: target.id },
      'insert-before',
    );
    expect(next).not.toBeNull();
    expect(ids(next!, 0)).not.toContain(moved.id);
    expect(ids(next!, 1)[1]).toBe(moved.id);
    expect(next!.categories[0]!.clues.length).toBe(4);
    expect(next!.categories[1]!.clues.length).toBe(5);
  });

  it('rejects cross-category insert when source would go below minimum', () => {
    const board = createDefaultBoard();
    const left = board.categories[0]!;
    const right = board.categories[1]!;
    const shortBoard = {
      ...board,
      categories: board.categories.map((cat, i) =>
        i === 0
          ? { ...cat, clues: cat.clues.slice(0, MIN_CLUES_PER_CATEGORY) }
          : i === 1
            ? { ...cat, clues: cat.clues.slice(0, MAX_CLUES_PER_CATEGORY - 1) }
            : cat,
      ),
    };
    const from = shortBoard.categories[0]!.clues[0]!;
    const to = shortBoard.categories[1]!.clues[0]!;
    const next = relocateTile(
      shortBoard,
      { categoryId: left.id, clueId: from.id },
      { categoryId: right.id, clueId: to.id },
      'insert-after',
    );
    expect(next).toBeNull();
  });

  it('uses swap mode via relocateTile', () => {
    const board = createDefaultBoard();
    const cat = board.categories[0]!;
    const a = cat.clues[0]!;
    const b = cat.clues[1]!;
    const next = relocateTile(
      board,
      { categoryId: cat.id, clueId: a.id },
      { categoryId: cat.id, clueId: b.id },
      'swap',
    );
    expect(ids(next!, 0)[0]).toBe(b.id);
    expect(ids(next!, 0)[1]).toBe(a.id);
  });
});

describe('moveTileToCategoryEnd', () => {
  it('moves a tile to the end of the same category', () => {
    const board = createDefaultBoard();
    const cat = board.categories[0]!;
    const first = cat.clues[0]!;
    const next = moveTileToCategoryEnd(board, { categoryId: cat.id, clueId: first.id }, cat.id);
    expect(ids(next!, 0).at(-1)).toBe(first.id);
  });
});
