import type {
  Board,
  BoardBackground,
  BoardColorTheme,
  BoardTheme,
  Category,
  CategoryHeaderStyle,
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
    })),
  };
}
