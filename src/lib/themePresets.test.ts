import { describe, expect, it } from 'vitest';
import { createDefaultBoardTheme } from './boardTheme';
import {
  BOARD_THEME_PRESETS,
  clonePresetTheme,
  findMatchingPresetId,
} from './themePresets';

describe('themePresets', () => {
  it('includes at least six presets with unique ids', () => {
    expect(BOARD_THEME_PRESETS.length).toBeGreaterThanOrEqual(6);
    const ids = BOARD_THEME_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each preset has complete color and solid background', () => {
    for (const preset of BOARD_THEME_PRESETS) {
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.theme.background.type).toBe('solid');
      expect(preset.theme.colors.tileBackground).toMatch(/^#/);
      expect(preset.theme.colors.pointValueText).toMatch(/^#/);
      expect(preset.theme.colors.categoryHeaderBackground).toMatch(/^#/);
    }
  });

  it('matches default theme to classic gold preset', () => {
    const defaultTheme = createDefaultBoardTheme();
    expect(findMatchingPresetId(defaultTheme)).toBe('classic-gold');
  });

  it('clonePresetTheme returns a deep copy', () => {
    const preset = BOARD_THEME_PRESETS[1];
    const cloned = clonePresetTheme(preset);
    cloned.colors.pointValueText = '#000000';
    expect(preset.theme.colors.pointValueText).not.toBe('#000000');
  });
});
