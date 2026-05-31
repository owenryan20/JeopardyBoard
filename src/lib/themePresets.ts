import type { BoardColorTheme, BoardTheme } from '../types/board';
import { createDefaultBoardTheme } from './boardTheme';

function chromeColors(
  colors: Omit<BoardColorTheme, 'topBarBackground' | 'footerBackground' | 'tileBackgroundHover'> & {
    topBarBackground?: string;
    footerBackground?: string;
    tileBackgroundHover?: string;
  },
): BoardColorTheme {
  return {
    ...colors,
    tileBackgroundHover: colors.tileBackgroundHover ?? colors.tileBackgroundSelected,
    topBarBackground: colors.topBarBackground ?? colors.tileBackground,
    footerBackground: colors.footerBackground ?? colors.tileBackground,
  };
}

export interface BoardThemePreset {
  id: string;
  name: string;
  description: string;
  theme: BoardTheme;
}

export const BOARD_THEME_PRESETS: BoardThemePreset[] = [
  {
    id: 'classic-gold',
    name: 'Classic Gold',
    description: 'Iconic blue board with gold point values',
    theme: createDefaultBoardTheme(),
  },
  {
    id: 'crimson-stage',
    name: 'Crimson Stage',
    description: 'Deep red studio with rose-gold accents',
    theme: {
      background: { type: 'solid', color: '#1a0a10' },
      colors: chromeColors({
        tileBackground: '#2d1520',
        tileBackgroundUsed: '#2d1520',
        tileBackgroundSelected: '#3d1f2c',
        tileBackgroundHover: '#452530',
        tileBorder: 'rgba(251, 113, 133, 0.4)',
        pointValueText: '#fda4af',
        clueText: '#fff1f2',
        categoryHeaderBackground: '#9f1239',
        categoryHeaderText: '#ffe4e6',
        topBarBackground: '#240812',
        footerBackground: '#240812',
      }),
    },
  },
  {
    id: 'forest-night',
    name: 'Forest Night',
    description: 'Dark evergreen with mint highlights',
    theme: {
      background: { type: 'solid', color: '#0a1410' },
      colors: chromeColors({
        tileBackground: '#152619',
        tileBackgroundUsed: '#152619',
        tileBackgroundSelected: '#1e3528',
        tileBackgroundHover: '#254532',
        tileBorder: 'rgba(110, 231, 183, 0.35)',
        pointValueText: '#6ee7b7',
        clueText: '#ecfdf5',
        categoryHeaderBackground: '#14532d',
        categoryHeaderText: '#d1fae5',
        topBarBackground: '#0c1812',
        footerBackground: '#0c1812',
      }),
    },
  },
  {
    id: 'royal-violet',
    name: 'Royal Violet',
    description: 'Rich purple with soft lavender points',
    theme: {
      background: { type: 'solid', color: '#120818' },
      colors: chromeColors({
        tileBackground: '#1f1030',
        tileBackgroundUsed: '#1f1030',
        tileBackgroundSelected: '#2a1840',
        tileBackgroundHover: '#322050',
        tileBorder: 'rgba(192, 132, 252, 0.4)',
        pointValueText: '#e9d5ff',
        clueText: '#faf5ff',
        categoryHeaderBackground: '#581c87',
        categoryHeaderText: '#f3e8ff',
        topBarBackground: '#160a20',
        footerBackground: '#160a20',
      }),
    },
  },
  {
    id: 'arctic-slate',
    name: 'Arctic Slate',
    description: 'Cool gray minimal with silver accents',
    theme: {
      background: { type: 'solid', color: '#0f1419' },
      colors: chromeColors({
        tileBackground: '#1c2430',
        tileBackgroundUsed: '#1c2430',
        tileBackgroundSelected: '#263040',
        tileBackgroundHover: '#303848',
        tileBorder: 'rgba(148, 163, 184, 0.35)',
        pointValueText: '#cbd5e1',
        clueText: '#f8fafc',
        categoryHeaderBackground: '#334155',
        categoryHeaderText: '#f1f5f9',
        topBarBackground: '#141a22',
        footerBackground: '#141a22',
      }),
    },
  },
  {
    id: 'neon-pulse',
    name: 'Neon Pulse',
    description: 'Dark arcade with cyan glow',
    theme: {
      background: { type: 'solid', color: '#0a0a14' },
      colors: chromeColors({
        tileBackground: '#12122a',
        tileBackgroundUsed: '#12122a',
        tileBackgroundSelected: '#1a1a40',
        tileBackgroundHover: '#222255',
        tileBorder: 'rgba(34, 211, 238, 0.45)',
        pointValueText: '#22d3ee',
        clueText: '#ecfeff',
        categoryHeaderBackground: '#0891b2',
        categoryHeaderText: '#ffffff',
        topBarBackground: '#0c0c18',
        footerBackground: '#0c0c18',
      }),
    },
  },
  {
    id: 'warm-copper',
    name: 'Warm Copper',
    description: 'Amber studio warmth with orange headers',
    theme: {
      background: { type: 'solid', color: '#1a1208' },
      colors: chromeColors({
        tileBackground: '#2a2018',
        tileBackgroundUsed: '#2a2018',
        tileBackgroundSelected: '#3a2c20',
        tileBackgroundHover: '#453528',
        tileBorder: 'rgba(251, 146, 60, 0.4)',
        pointValueText: '#fdba74',
        clueText: '#fff7ed',
        categoryHeaderBackground: '#9a3412',
        categoryHeaderText: '#ffedd5',
        topBarBackground: '#1f160c',
        footerBackground: '#1f160c',
      }),
    },
  },
  {
    id: 'studio-teal',
    name: 'Studio Teal',
    description: 'Broadcast teal with crisp white text',
    theme: {
      background: { type: 'solid', color: '#081418' },
      colors: chromeColors({
        tileBackground: '#0f2228',
        tileBackgroundUsed: '#0f2228',
        tileBackgroundSelected: '#163038',
        tileBackgroundHover: '#1c3a42',
        tileBorder: 'rgba(45, 212, 191, 0.35)',
        pointValueText: '#2dd4bf',
        clueText: '#f0fdfa',
        categoryHeaderBackground: '#0f766e',
        categoryHeaderText: '#ccfbf1',
        topBarBackground: '#0a1a1e',
        footerBackground: '#0a1a1e',
      }),
    },
  },
];

export function findMatchingPresetId(theme: BoardTheme): string | null {
  for (const preset of BOARD_THEME_PRESETS) {
    if (themesEqual(theme, preset.theme)) return preset.id;
  }
  return null;
}

function themesEqual(a: BoardTheme, b: BoardTheme): boolean {
  if (a.background.type !== b.background.type) return false;
  if (a.background.type === 'solid' && b.background.type === 'solid') {
    if (a.background.color.toLowerCase() !== b.background.color.toLowerCase()) return false;
  } else if (a.background.type === 'gradient' && b.background.type === 'gradient') {
    if (
      a.background.from.toLowerCase() !== b.background.from.toLowerCase() ||
      a.background.to.toLowerCase() !== b.background.to.toLowerCase()
    ) {
      return false;
    }
  } else if (a.background.type === 'image' || b.background.type === 'image') {
    return false;
  }

  const keys = Object.keys(a.colors) as (keyof BoardTheme['colors'])[];
  return keys.every((key) => a.colors[key].toLowerCase() === b.colors[key].toLowerCase());
}

export function clonePresetTheme(preset: BoardThemePreset): BoardTheme {
  return {
    background: { ...preset.theme.background } as BoardTheme['background'],
    colors: { ...preset.theme.colors },
  };
}
