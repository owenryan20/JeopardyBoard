import { describe, expect, it } from 'vitest';
import { createDefaultBoardTheme, DEFAULT_BOARD_COLORS, migrateBoardTheme, migrateTeamTheme } from './boardTheme';

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
