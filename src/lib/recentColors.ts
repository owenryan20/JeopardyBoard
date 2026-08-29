export const RECENT_COLORS_KEY = 'jeff-hardy-recent-colors';
export const MAX_RECENT_COLORS = 8;

/** Common board / accent colors for the appearance color picker. */
export const COLOR_PRESETS: { label: string; value: string }[] = [
  { label: 'Jeopardy blue', value: '#1a2744' },
  { label: 'Royal blue', value: '#1e3a8a' },
  { label: 'Gold', value: '#fbbf24' },
  { label: 'White', value: '#ffffff' },
  { label: 'Slate', value: '#0f172a' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Pink', value: '#db2777' },
  { label: 'Gray', value: '#64748b' },
];

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  const short = /^#([0-9a-f]{3})$/i.exec(trimmed);
  if (short) {
    const [r, g, b] = short[1]!;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  const full = /^#([0-9a-f]{6})$/i.exec(trimmed);
  return full ? `#${full[1]}` : null;
}

export function loadRecentColors(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COLORS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((c) => (typeof c === 'string' ? normalizeHexColor(c) : null))
      .filter((c): c is string => Boolean(c))
      .slice(0, MAX_RECENT_COLORS);
  } catch {
    return [];
  }
}

export function rememberRecentColor(color: string): string[] {
  const hex = normalizeHexColor(color);
  if (!hex) return loadRecentColors();
  const next = [hex, ...loadRecentColors().filter((c) => c !== hex)].slice(0, MAX_RECENT_COLORS);
  try {
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
  return next;
}
