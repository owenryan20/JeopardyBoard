import type {
  Board,
  BoardBackground,
  BoardColorTheme,
  BoardTheme,
  Category,
  CategoryHeaderStyle,
  Clue,
  ClueStyle,
  Team,
  TeamTheme,
} from '../types/board';

export const DEFAULT_BOARD_COLORS: BoardColorTheme = {
  tileBackground: '#1a2744',
  tileBackgroundUsed: '#1a2744',
  tileBorder: 'rgba(251, 191, 36, 0.3)',
  tileBackgroundSelected: '#243656',
  tileBackgroundHover: '#1a3050',
  pointValueText: '#fbbf24',
  clueText: '#ffffff',
  categoryHeaderBackground: '#1e3a8a',
  categoryHeaderText: '#ffffff',
  topBarBackground: '#132238',
  footerBackground: '#132238',
};

export const DEFAULT_SOLID_BACKGROUND_COLOR = '#0a1628';

export const DEFAULT_BOARD_BACKGROUND: BoardBackground = {
  type: 'solid',
  color: DEFAULT_SOLID_BACKGROUND_COLOR,
};

export const DEFAULT_TEAM_THEME: TeamTheme = {
  color: '#3b82f6',
  textColor: '#ffffff',
};

export const DEFAULT_TEAM_COLORS = [
  '#3b82f6',
  '#a855f7',
  '#14b8a6',
  '#f97316',
  '#ec4899',
  '#22c55e',
  '#eab308',
  '#06b6d4',
  '#ef4444',
  '#8b5cf6',
];

export function createDefaultBoardTheme(): BoardTheme {
  return {
    background: { ...DEFAULT_BOARD_BACKGROUND },
    colors: { ...DEFAULT_BOARD_COLORS },
  };
}

export function migrateBoardTheme(raw?: Partial<BoardTheme> | null): BoardTheme {
  const defaults = createDefaultBoardTheme();
  if (!raw) return defaults;
  return {
    background: migrateBackground(raw.background) ?? defaults.background,
    colors: { ...defaults.colors, ...raw.colors },
  };
}

export function migrateBackground(raw?: Partial<BoardBackground> | null): BoardBackground | undefined {
  if (!raw?.type) return undefined;
  if (raw.type === 'solid') {
    const color = 'color' in raw && raw.color ? raw.color : DEFAULT_SOLID_BACKGROUND_COLOR;
    return { type: 'solid', color };
  }
  if (raw.type === 'gradient') {
    return {
      type: 'gradient',
      from: raw.from ?? '#0a1628',
      to: raw.to ?? '#1e3a8a',
      angle: raw.angle ?? 180,
    };
  }
  if (raw.type === 'image') {
    return {
      type: 'image',
      url: raw.url ?? '',
      storage: raw.storage,
      mediaId: raw.mediaId,
      overlayColor: raw.overlayColor ?? '#000000',
      overlayOpacity: raw.overlayOpacity ?? 0.45,
    };
  }
  return undefined;
}

export function migrateCategoryStyle(raw?: Partial<CategoryHeaderStyle> | null): CategoryHeaderStyle | undefined {
  if (!raw) return undefined;
  const style: CategoryHeaderStyle = {};
  if (raw.headerBackground) style.headerBackground = raw.headerBackground;
  if (raw.headerTextColor) style.headerTextColor = raw.headerTextColor;
  if (raw.headerBackgroundImage) style.headerBackgroundImage = raw.headerBackgroundImage;
  return Object.keys(style).length > 0 ? style : undefined;
}

export function migrateClueStyle(raw?: Partial<ClueStyle> | null): ClueStyle | undefined {
  if (!raw) return undefined;
  const style: ClueStyle = {};
  if (typeof raw.tileBackground === 'string' && raw.tileBackground.trim()) {
    style.tileBackground = raw.tileBackground.trim();
  }
  if (typeof raw.pointValueText === 'string' && raw.pointValueText.trim()) {
    style.pointValueText = raw.pointValueText.trim();
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

/** Pick readable point-value text for a solid tile fill. */
export function contrastingPointText(background: string): string {
  const hex = background.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!match) return '#ffffff';
  let r = 0;
  let g = 0;
  let b = 0;
  const body = match[1]!;
  if (body.length === 3) {
    r = parseInt(body[0]! + body[0]!, 16);
    g = parseInt(body[1]! + body[1]!, 16);
    b = parseInt(body[2]! + body[2]!, 16);
  } else {
    r = parseInt(body.slice(0, 2), 16);
    g = parseInt(body.slice(2, 4), 16);
    b = parseInt(body.slice(4, 6), 16);
  }
  // Relative luminance (sRGB approximation)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? '#0f172a' : '#ffffff';
}

export function getClueTileStyle(
  clue: Clue,
  board: Board,
): { tileBackground: string; pointValueText: string; hasOverride: boolean } {
  const boardTheme = migrateBoardTheme(board.theme);
  const override = migrateClueStyle(clue.style);
  const tileBackground = override?.tileBackground ?? boardTheme.colors.tileBackground;
  const pointValueText =
    override?.pointValueText
    ?? (override?.tileBackground
      ? contrastingPointText(override.tileBackground)
      : boardTheme.colors.pointValueText);
  return {
    tileBackground,
    pointValueText,
    hasOverride: Boolean(override?.tileBackground || override?.pointValueText),
  };
}

function withClueStyle(clue: Clue, style: ClueStyle | undefined): Clue {
  if (!style) {
    if (!clue.style) return clue;
    const { style: _removed, ...rest } = clue;
    return rest;
  }
  return { ...clue, style };
}

function paintStyle(color: string): ClueStyle {
  return {
    tileBackground: color,
    pointValueText: contrastingPointText(color),
  };
}

/** Collect clue ids for a row index across all categories. */
export function clueIdsInRow(board: Board, rowIndex: number): string[] {
  if (rowIndex < 0) return [];
  const ids: string[] = [];
  for (const cat of board.categories) {
    const clue = cat.clues[rowIndex];
    if (clue) ids.push(clue.id);
  }
  return ids;
}

/** Collect clue ids for an entire category column. */
export function clueIdsInColumn(board: Board, categoryId: string): string[] {
  const cat = board.categories.find((c) => c.id === categoryId);
  return cat ? cat.clues.map((c) => c.id) : [];
}

/** Set or clear color on every clue id in the list (any categories). */
export function applyTileColorsToClueIds(
  board: Board,
  clueIds: string[],
  color: string | null,
): Board {
  if (clueIds.length === 0) return board;
  const targets = new Set(clueIds);
  const style = color ? paintStyle(color) : undefined;
  return {
    ...board,
    categories: board.categories.map((cat) => ({
      ...cat,
      clues: cat.clues.map((clue) =>
        targets.has(clue.id) ? withClueStyle(clue, style) : clue,
      ),
    })),
  };
}

/** Set or clear color on a single tile. Pass null to clear. */
export function applyTileColor(
  board: Board,
  _categoryId: string,
  clueId: string,
  color: string | null,
): Board {
  return applyTileColorsToClueIds(board, [clueId], color);
}

/** Paint every tile in the same row index across categories. */
export function applyRowTileColor(board: Board, rowIndex: number, color: string | null): Board {
  return applyTileColorsToClueIds(board, clueIdsInRow(board, rowIndex), color);
}

/** Paint every tile in a category column. */
export function applyColumnTileColor(
  board: Board,
  categoryId: string,
  color: string | null,
): Board {
  return applyTileColorsToClueIds(board, clueIdsInColumn(board, categoryId), color);
}

function stripClueStyle(clue: Clue): Clue {
  if (!clue.style) return clue;
  const { style: _removed, ...rest } = clue;
  return rest;
}

/** Remove every per-tile color override on the board (including Final Jeopardy). */
export function clearAllTileColors(board: Board): Board {
  return {
    ...board,
    categories: board.categories.map((cat) => ({
      ...cat,
      clues: cat.clues.map(stripClueStyle),
    })),
    finalJeopardy: {
      ...board.finalJeopardy,
      tile: stripClueStyle(board.finalJeopardy.tile),
    },
  };
}

/** Restore default board theme and clear tile / category color overrides. */
export function resetAllBoardColors(board: Board): Board {
  const cleared = clearAllTileColors(board);
  return {
    ...cleared,
    theme: createDefaultBoardTheme(),
    categories: cleared.categories.map((cat) => ({
      ...cat,
      style: undefined,
    })),
  };
}

export function migrateTeamTheme(raw?: Partial<TeamTheme> | null, fallbackColor?: string): TeamTheme {
  const color = raw?.color ?? fallbackColor ?? DEFAULT_TEAM_THEME.color;
  return {
    color,
    textColor: raw?.textColor ?? DEFAULT_TEAM_THEME.textColor,
    background: raw?.background ? migrateBackground(raw.background) : undefined,
  };
}

export function migrateTeam(raw: Team, index: number): Team {
  return {
    ...raw,
    theme: migrateTeamTheme(raw.theme, DEFAULT_TEAM_COLORS[index % DEFAULT_TEAM_COLORS.length]),
  };
}

export function getCategoryHeaderStyle(category: Category, board: Board): Required<CategoryHeaderStyle> {
  const boardTheme = migrateBoardTheme(board.theme);
  return {
    headerBackground:
      category.style?.headerBackground ?? boardTheme.colors.categoryHeaderBackground,
    headerTextColor:
      category.style?.headerTextColor ?? boardTheme.colors.categoryHeaderText,
    headerBackgroundImage: category.style?.headerBackgroundImage ?? '',
  };
}

export function backgroundToCss(bg: BoardBackground): string {
  if (bg.type === 'solid') return bg.color;
  if (bg.type === 'gradient') {
    const angle = bg.angle ?? 180;
    return `linear-gradient(${angle}deg, ${bg.from}, ${bg.to})`;
  }
  return 'transparent';
}

export function boardThemeToCssVars(theme: BoardTheme): Record<string, string> {
  const colors = theme.colors;
  return {
    '--board-bg': backgroundToCss(theme.background),
    '--board-tile-bg': colors.tileBackground,
    '--board-tile-bg-used': colors.tileBackgroundUsed,
    '--board-tile-bg-selected': colors.tileBackgroundSelected,
    '--board-tile-bg-hover': colors.tileBackgroundHover,
    '--board-tile-border': colors.tileBorder,
    '--board-point-text': colors.pointValueText,
    '--board-clue-text': colors.clueText,
    '--board-cat-bg': colors.categoryHeaderBackground,
    '--board-cat-text': colors.categoryHeaderText,
    '--board-top-bar-bg': colors.topBarBackground,
    '--board-footer-bg': colors.footerBackground,
  };
}

export function migrateBoardWithTheme(board: Board): Board {
  return {
    ...board,
    theme: migrateBoardTheme(board.theme),
    categories: board.categories.map((cat) => ({
      ...cat,
      style: migrateCategoryStyle(cat.style),
      clues: cat.clues.map((clue) => ({
        ...clue,
        style: migrateClueStyle(clue.style),
      })),
    })),
  };
}
