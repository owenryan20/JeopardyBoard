import { useEffect, useId, useRef, useState } from 'react';
import {
  COLOR_PRESETS,
  loadRecentColors,
  normalizeHexColor,
  rememberRecentColor,
} from '../../lib/recentColors';
import { DEFAULT_BOARD_COLORS } from '../../lib/boardTheme';
import './ColorPicker.css';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function toPickerHex(value: string): string {
  return normalizeHexColor(value) ?? DEFAULT_BOARD_COLORS.tileBackground;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const hex = toPickerHex(value);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const dirtyRef = useRef(false);
  const latestHexRef = useRef(hex);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => loadRecentColors());

  latestHexRef.current = hex;
  openRef.current = open;

  const flushRecentIfNeeded = () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    setRecent(rememberRecentColor(latestHexRef.current));
  };

  const closePanel = () => {
    if (!openRef.current) return;
    setOpen(false);
    flushRecentIfNeeded();
  };

  useEffect(() => {
    if (!open) return;
    setRecent(loadRecentColors());

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closePanel();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // If this picker unmounts while open (tile change, modal close), keep the final color.
  useEffect(() => {
    return () => {
      if (openRef.current) {
        flushRecentIfNeeded();
      }
    };
  }, []);

  const preview = (next: string) => {
    const normalized = normalizeHexColor(next) ?? next;
    dirtyRef.current = true;
    latestHexRef.current = toPickerHex(normalized);
    onChange(normalized);
  };

  return (
    <div className="color-picker" ref={rootRef}>
      <div className="color-field">
        <span className="color-field-label">{label}</span>
        <button
          type="button"
          className="color-picker-trigger"
          aria-label={`${label}: ${hex}. Open color options`}
          aria-expanded={open}
          aria-controls={panelId}
          style={{ background: hex }}
          onClick={() => {
            if (open) {
              closePanel();
            } else {
              dirtyRef.current = false;
              setOpen(true);
            }
          }}
        />
      </div>

      {open && (
        <div className="color-picker-panel" id={panelId} role="dialog" aria-label={`${label} color options`}>
          <label className="color-picker-custom">
            Custom
            <input
              type="color"
              value={hex}
              onChange={(e) => preview(e.target.value)}
            />
          </label>

          <div className="color-swatch-block">
            <p className="color-swatch-label">Presets</p>
            <div className="color-swatch-row" role="list">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  role="listitem"
                  className={`color-swatch${hex === preset.value.toLowerCase() ? ' color-swatch-selected' : ''}`}
                  style={{ background: preset.value }}
                  title={preset.label}
                  aria-label={`${preset.label} ${preset.value}`}
                  onClick={() => preview(preset.value)}
                />
              ))}
            </div>
          </div>

          <div className="color-swatch-block">
            <p className="color-swatch-label">Recent</p>
            {recent.length === 0 ? (
              <p className="color-swatch-empty">No recent colors yet</p>
            ) : (
              <div className="color-swatch-row" role="list">
                {recent.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="listitem"
                    className={`color-swatch${hex === color ? ' color-swatch-selected' : ''}`}
                    style={{ background: color }}
                    title={color}
                    aria-label={`Recent color ${color}`}
                    onClick={() => preview(color)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
