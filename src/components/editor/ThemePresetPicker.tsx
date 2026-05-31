import type { BoardTheme } from '../../types/board';
import { migrateBoardTheme } from '../../lib/boardTheme';
import {
  BOARD_THEME_PRESETS,
  findMatchingPresetId,
  type BoardThemePreset,
} from '../../lib/themePresets';
import './ThemePresetPicker.css';

interface ThemePresetPickerProps {
  theme: BoardTheme;
  onSelect: (preset: BoardThemePreset) => void;
}

export function ThemePresetPicker({ theme, onSelect }: ThemePresetPickerProps) {
  const migrated = migrateBoardTheme(theme);
  const activeId = findMatchingPresetId(migrated);

  return (
    <section className="appearance-section appearance-section-first theme-preset-section">
      <h4>Theme presets</h4>
      <p className="field-hint">Start from a curated look, then fine-tune below.</p>
      <ul className="theme-preset-grid" role="list">
        {BOARD_THEME_PRESETS.map((preset) => (
          <li key={preset.id}>
            <button
              type="button"
              className={`theme-preset-btn${activeId === preset.id ? ' is-active' : ''}`}
              aria-pressed={activeId === preset.id}
              title={preset.description}
              onClick={() => onSelect(preset)}
            >
              <ThemePresetSwatch preset={preset} />
              <span className="theme-preset-name">{preset.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ThemePresetSwatch({ preset }: { preset: BoardThemePreset }) {
  const { background, colors } = preset.theme;
  const bgColor = background.type === 'solid' ? background.color : '#0a1628';

  return (
    <span className="theme-preset-swatch" aria-hidden="true">
      <span className="theme-preset-swatch-bg" style={{ background: bgColor }} />
      <span className="theme-preset-swatch-tile" style={{ background: colors.tileBackground }} />
      <span
        className="theme-preset-swatch-accent"
        style={{
          background: colors.categoryHeaderBackground,
          color: colors.pointValueText,
        }}
      >
        500
      </span>
    </span>
  );
}
