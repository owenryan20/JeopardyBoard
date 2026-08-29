import { describe, expect, it } from 'vitest';
import {
  applyColumnTileColor,
  applyRowTileColor,
  applyTileColor,
  applyTileColorsToClueIds,
  clueIdsInColumn,
  clueIdsInRow,
  contrastingPointText,
  createDefaultBoardTheme,
  DEFAULT_BOARD_COLORS,
  getClueTileStyle,
  migrateBoardTheme,
  migrateClueStyle,
  migrateTeamTheme,
  resetAllBoardColors,
} from './boardTheme';
import { createDefaultBoard } from './boardFactory';

describe('boardTheme', () => {
  it('applies defaults when theme is missing', () => {
    const theme = migrateBoardTheme(undefined);
    expect(theme.colors.tileBackground).toBeTruthy();
    expect(theme.background.type).toBe('solid');
  });

  it('applies team theme defaults when missing', () => {
    const theme = migrateTeamTheme(undefined, '#ff0000');
    expect(theme.color).toBe('#ff0000');
    expect(theme.textColor).toBeTruthy();
  });

  it('preserves image background without url (setup state)', () => {
    const theme = migrateBoardTheme({
      background: { type: 'image', url: '', overlayColor: '#000', overlayOpacity: 0.5 },
      colors: DEFAULT_BOARD_COLORS,
    });
    expect(theme.background.type).toBe('image');
  });

  it('preserves local image background with mediaId only', () => {
    const theme = migrateBoardTheme({
      background: {
        type: 'image',
        url: '',
        storage: 'local',
        mediaId: 'abc-123',
      },
      colors: DEFAULT_BOARD_COLORS,
    });
    expect(theme.background.type).toBe('image');
    if (theme.background.type === 'image') {
      expect(theme.background.mediaId).toBe('abc-123');
    }
  });
});

describe('createDefaultBoardTheme', () => {
  it('matches classic jeopardy palette keys', () => {
    const theme = createDefaultBoardTheme();
    expect(theme.colors.pointValueText).toMatch(/^#/);
    expect(theme.colors.categoryHeaderBackground).toMatch(/^#/);
  });
});

describe('tile color overrides', () => {
  it('migrates clue style and ignores empty values', () => {
    expect(migrateClueStyle({ tileBackground: '  #dc2626  ' })?.tileBackground).toBe('#dc2626');
    expect(migrateClueStyle({})).toBeUndefined();
  });

  it('picks contrasting point text for light and dark fills', () => {
    expect(contrastingPointText('#ffffff')).toBe('#0f172a');
    expect(contrastingPointText('#dc2626')).toBe('#ffffff');
  });

  it('applies color to one tile, a row, and a column', () => {
    const board = createDefaultBoard();
    const cat = board.categories[0]!;
    const clue = cat.clues[1]!;

    const one = applyTileColor(board, cat.id, clue.id, '#dc2626');
    expect(getClueTileStyle(one.categories[0]!.clues[1]!, one).tileBackground).toBe('#dc2626');
    expect(getClueTileStyle(one.categories[0]!.clues[0]!, one).hasOverride).toBe(false);

    const row = applyRowTileColor(board, 2, '#16a34a');
    for (const category of row.categories) {
      expect(category.clues[2]!.style?.tileBackground).toBe('#16a34a');
      expect(category.clues[0]!.style?.tileBackground).toBeUndefined();
    }

    const col = applyColumnTileColor(board, cat.id, '#2563eb');
    expect(col.categories[0]!.clues.every((c) => c.style?.tileBackground === '#2563eb')).toBe(true);
    expect(col.categories[1]!.clues[0]!.style).toBeUndefined();
  });

  it('clears a tile color override', () => {
    const board = createDefaultBoard();
    const cat = board.categories[0]!;
    const clue = cat.clues[0]!;
    const painted = applyTileColor(board, cat.id, clue.id, '#dc2626');
    const cleared = applyTileColor(painted, cat.id, clue.id, null);
    expect(cleared.categories[0]!.clues[0]!.style).toBeUndefined();
  });

  it('resets theme and clears all tile color overrides', () => {
    const board = createDefaultBoard();
    const cat = board.categories[0]!;
    const painted = applyColumnTileColor(board, cat.id, '#dc2626');
    const themed = {
      ...painted,
      theme: {
        ...migrateBoardTheme(painted.theme),
        colors: {
          ...migrateBoardTheme(painted.theme).colors,
          tileBackground: '#112233',
        },
      },
      categories: painted.categories.map((c, i) =>
        i === 0 ? { ...c, style: { headerBackground: '#445566' } } : c,
      ),
    };
    const reset = resetAllBoardColors(themed);
    expect(reset.theme?.colors.tileBackground).toBe(DEFAULT_BOARD_COLORS.tileBackground);
    expect(reset.categories[0]!.style).toBeUndefined();
    expect(reset.categories[0]!.clues.every((c) => !c.style)).toBe(true);
  });

  it('collects row and column clue ids and paints a selection', () => {
    const board = createDefaultBoard();
    const cat = board.categories[0]!;
    const rowIds = clueIdsInRow(board, 1);
    expect(rowIds).toHaveLength(board.categories.length);
    expect(clueIdsInColumn(board, cat.id)).toEqual(cat.clues.map((c) => c.id));

    const painted = applyTileColorsToClueIds(board, rowIds, '#16a34a');
    for (const category of painted.categories) {
      expect(category.clues[1]!.style?.tileBackground).toBe('#16a34a');
      expect(category.clues[0]!.style).toBeUndefined();
    }
  });
});
